#!/usr/bin/env python3
# analyze.py — Script principal: lee tickers.xlsx, analiza con yfinance, genera docs/data.json

import json
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

# Importar módulos locales
sys.path.insert(0, str(Path(__file__).parent))
from ratios import calcular_valoracion, calcular_rentabilidad, calcular_solvencia, calcular_crecimiento, calcular_cashflow
from valuation import calcular_dcf, calcular_graham, calcular_gordon
from scoring import calcular_score
from benchmarks import compare_to_benchmark


ROOT = Path(__file__).parent.parent
EXCEL_PATH = ROOT / "tickers.xlsx"
OUTPUT_PATH = ROOT / "docs" / "data.json"


def _norm(s: str) -> str:
    """Normaliza nombre de columna: minúsculas sin tildes."""
    import unicodedata
    return unicodedata.normalize("NFD", str(s).lower().strip()).encode("ascii", "ignore").decode()


TICKER_COL_CANDIDATES = ["ticker", "codigo", "symbol", "simbolo", "accion", "code"]
NOMBRE_COL_CANDIDATES = ["nombre", "name", "company", "empresa"]
CAT_COL_CANDIDATES    = ["categoria", "category", "sector", "grupo"]
NOTAS_COL_CANDIDATES  = ["notas", "notes", "nota", "comentario"]


def _find_col(df: "pd.DataFrame", candidates: list[str]):
    """Devuelve el nombre real de la primera columna que coincida (case/accent-insensitive)."""
    col_map = {_norm(c): c for c in df.columns}
    for cand in candidates:
        if cand in col_map:
            return col_map[cand]
    return None


def leer_tickers(path: Path) -> list[dict]:
    """Lee el archivo Excel y devuelve lista de dicts con info de cada ticker.

    Acepta cualquier nombre de columna para el ticker: 'Ticker', 'Código', 'Symbol', etc.
    Las columnas opcionales Nombre, Categoría y Notas son detectadas de forma flexible.
    Si no hay coincidencia se usa la primera columna como ticker.
    """
    # Intentar hoja 'Tickers'; si no existe usar la primera hoja
    try:
        df = pd.read_excel(path, sheet_name="Tickers", engine="openpyxl")
    except Exception:
        df = pd.read_excel(path, sheet_name=0, engine="openpyxl")

    df.columns = [str(c).strip() for c in df.columns]

    # Detectar columna de tickers
    ticker_col = _find_col(df, TICKER_COL_CANDIDATES) or df.columns[0]
    nombre_col = _find_col(df, NOMBRE_COL_CANDIDATES)
    cat_col    = _find_col(df, CAT_COL_CANDIDATES)
    notas_col  = _find_col(df, NOTAS_COL_CANDIDATES)

    print(f"[analyze] Columna ticker detectada: '{ticker_col}' | Hojas: {pd.ExcelFile(path, engine='openpyxl').sheet_names}")

    def safe_str(row, col):
        if col is None:
            return ""
        val = row.get(col)
        return str(val).strip() if pd.notna(val) else ""

    tickers = []
    for _, row in df.iterrows():
        ticker = str(row.get(ticker_col, "")).strip().upper()
        if not ticker or ticker == "NAN":
            continue
        tickers.append({
            "ticker":    ticker,
            "nombre":    safe_str(row, nombre_col),
            "categoria": safe_str(row, cat_col),
            "notas":     safe_str(row, notas_col),
        })

    print(f"[analyze] Tickers encontrados en Excel: {len(tickers)}")
    return tickers


def analizar_ticker(ticker_info: dict) -> dict:
    """Descarga datos de yfinance y calcula todos los ratios para un ticker."""
    ticker = ticker_info["ticker"]
    print(f"  → Analizando {ticker}...", end=" ", flush=True)

    resultado = {
        "ticker": ticker,
        "nombre": ticker_info["nombre"],
        "categoria": ticker_info["categoria"],
        "notas": ticker_info["notas"],
        "sector": None,
        "industria": None,
        "precio_actual": None,
        "market_cap": None,
        "currency": None,
        "ratios": {},
        "valuacion": {},
        "scoring": {},
        "benchmark_comparison": {},
        "error": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        yf_ticker = yf.Ticker(ticker)
        info = yf_ticker.info

        # Validar que yfinance devolvió datos reales
        if not info or not info.get("regularMarketPrice") and not info.get("currentPrice"):
            resultado["error"] = "yfinance no devolvió datos de precio para este ticker"
            print("✗ sin datos")
            return resultado

        # Datos básicos
        resultado["sector"] = info.get("sector") or "Unknown"
        resultado["industria"] = info.get("industry") or ""
        resultado["precio_actual"] = info.get("currentPrice") or info.get("regularMarketPrice")
        resultado["market_cap"] = info.get("marketCap")
        resultado["currency"] = info.get("currency", "USD")
        resultado["nombre"] = resultado["nombre"] or info.get("longName") or ticker
        resultado["descripcion"] = info.get("longBusinessSummary", "")[:300] if info.get("longBusinessSummary") else ""

        # Cálculo de ratios
        resultado["ratios"] = {
            "valoracion": calcular_valoracion(info, {}),
            "rentabilidad": calcular_rentabilidad(info),
            "solvencia": calcular_solvencia(info),
            "crecimiento": calcular_crecimiento(info),
            "cashflow": calcular_cashflow(info),
        }

        # Valuación intrínseca
        resultado["valuacion"] = {
            "dcf": calcular_dcf(info),
            "graham": calcular_graham(info),
            "gordon": calcular_gordon(info),
        }

        # Scoring
        sector = resultado["sector"]
        resultado["scoring"] = calcular_score(
            resultado["ratios"], resultado["valuacion"], sector
        )

        # Comparación con benchmark sectorial
        ratios_flat = {
            "pe": resultado["ratios"]["valoracion"].get("pe"),
            "ev_ebitda": resultado["ratios"]["valoracion"].get("ev_ebitda"),
            "pb": resultado["ratios"]["valoracion"].get("pb"),
            "roe": (resultado["ratios"]["rentabilidad"].get("roe") or 0) / 100,
            "net_margin": (resultado["ratios"]["rentabilidad"].get("net_margin") or 0) / 100,
        }
        resultado["benchmark_comparison"] = compare_to_benchmark(ratios_flat, sector)

        print("✓")

    except Exception as e:
        resultado["error"] = f"{type(e).__name__}: {str(e)}"
        print(f"✗ error: {resultado['error']}")
        if os.environ.get("DEBUG"):
            traceback.print_exc()

    return resultado


def main():
    print(f"\n{'='*60}")
    print(f" Stock Screener — Análisis Fundamental")
    print(f" {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*60}\n")

    if not EXCEL_PATH.exists():
        print(f"[ERROR] No se encontró {EXCEL_PATH}")
        sys.exit(1)

    tickers = leer_tickers(EXCEL_PATH)
    if not tickers:
        print("[ERROR] No se encontraron tickers en el Excel")
        sys.exit(1)

    resultados = []
    errores = []

    for ticker_info in tickers:
        resultado = analizar_ticker(ticker_info)
        resultados.append(resultado)
        if resultado["error"]:
            errores.append(ticker_info["ticker"])

    # Estadísticas finales
    exitosos = len(resultados) - len(errores)
    print(f"\n{'='*60}")
    print(f" Resultado: {exitosos}/{len(resultados)} tickers procesados OK")
    if errores:
        print(f" Con errores: {', '.join(errores)}")
    print(f"{'='*60}\n")

    # Generar data.json
    output = {
        "ultima_actualizacion": datetime.now(timezone.utc).isoformat(),
        "total_tickers": len(resultados),
        "exitosos": exitosos,
        "con_errores": errores,
        "acciones": resultados,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=str)

    print(f"[OK] data.json generado en: {OUTPUT_PATH}")
    return 0 if not errores else 1


if __name__ == "__main__":
    sys.exit(main())

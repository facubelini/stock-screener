# valuation.py — Valuación intrínseca: DCF, Graham, Gordon Growth

import math


def safe_div(a, b):
    if a is None or b is None or b == 0:
        return None
    try:
        result = a / b
        if math.isnan(result) or math.isinf(result):
            return None
        return result
    except Exception:
        return None


def calcular_dcf(info: dict, growth_history: list = None) -> dict:
    """
    DCF simplificado de 5 años + valor terminal.
    - FCF actual como base
    - Tasa de crecimiento = min(promedio histórico, 12%) o 4% por defecto
    - WACC = Rf 4.2% + beta * ERP 4.5%
    - Crecimiento terminal = 2.5%
    """
    resultado = {
        "metodo": "DCF 5 años + terminal",
        "valor_intrinseco": None,
        "precio_actual": None,
        "upside_pct": None,
        "parametros": {},
        "error": None,
    }

    try:
        fcf = info.get("freeCashflow")
        shares = info.get("sharesOutstanding")
        precio_actual = info.get("currentPrice") or info.get("regularMarketPrice")
        beta = info.get("beta", 1.0) or 1.0
        total_debt = info.get("totalDebt", 0) or 0
        total_cash = info.get("totalCash", 0) or 0

        if not fcf or not shares or fcf <= 0:
            resultado["error"] = "FCF negativo o no disponible"
            resultado["precio_actual"] = precio_actual
            return resultado

        # Tasa de crecimiento estimada
        revenue_growth = info.get("revenueGrowth") or 0
        earnings_growth = info.get("earningsGrowth") or 0
        avg_growth = (revenue_growth + earnings_growth) / 2

        if growth_history and len(growth_history) > 0:
            hist_avg = sum(growth_history) / len(growth_history)
            tasa_crecimiento = min(abs(hist_avg), 0.12)
        elif avg_growth and avg_growth > 0:
            tasa_crecimiento = min(avg_growth, 0.12)
        else:
            tasa_crecimiento = 0.04  # default conservador

        # WACC
        rf = 0.042       # risk-free rate (US 10Y ~4.2%)
        erp = 0.045      # equity risk premium
        wacc = rf + beta * erp
        wacc = max(0.06, min(wacc, 0.20))  # clamp entre 6% y 20%

        # Crecimiento terminal
        g_terminal = 0.025

        # Proyectar FCF 5 años
        valor_presente = 0
        fcf_actual = fcf
        for year in range(1, 6):
            fcf_proyectado = fcf_actual * ((1 + tasa_crecimiento) ** year)
            vp = fcf_proyectado / ((1 + wacc) ** year)
            valor_presente += vp

        # Valor terminal (Gordon)
        fcf_año6 = fcf_actual * ((1 + tasa_crecimiento) ** 5) * (1 + g_terminal)
        valor_terminal = fcf_año6 / (wacc - g_terminal)
        vp_terminal = valor_terminal / ((1 + wacc) ** 5)

        valor_empresa = valor_presente + vp_terminal

        # Restar deuda neta
        deuda_neta = total_debt - total_cash
        valor_equity = valor_empresa - deuda_neta

        valor_por_accion = safe_div(valor_equity, shares)

        if valor_por_accion and precio_actual:
            upside = ((valor_por_accion - precio_actual) / precio_actual) * 100
            resultado["valor_intrinseco"] = round(valor_por_accion, 2)
            resultado["upside_pct"] = round(upside, 1)

        resultado["precio_actual"] = precio_actual
        resultado["parametros"] = {
            "tasa_crecimiento_pct": round(tasa_crecimiento * 100, 1),
            "wacc_pct": round(wacc * 100, 1),
            "g_terminal_pct": round(g_terminal * 100, 1),
            "fcf_base": fcf,
            "beta": round(beta, 2),
        }

    except Exception as e:
        resultado["error"] = str(e)

    return resultado


def calcular_graham(info: dict) -> dict:
    """
    Número de Graham: BPA * (8.5 + 2g) * 4.4 / AAA_yield
    Usamos AAA_yield = 4.2% (proxy tasa libre de riesgo actual).
    """
    resultado = {
        "metodo": "Graham Number",
        "valor_intrinseco": None,
        "precio_actual": None,
        "upside_pct": None,
        "parametros": {},
        "error": None,
    }

    try:
        eps = info.get("trailingEps") or info.get("forwardEps")
        precio_actual = info.get("currentPrice") or info.get("regularMarketPrice")
        earnings_growth = info.get("earningsGrowth") or 0

        if not eps or eps <= 0:
            resultado["error"] = "EPS no disponible o negativo"
            resultado["precio_actual"] = precio_actual
            return resultado

        # Tasa de crecimiento esperada (en %, acotada)
        g = min(max(earnings_growth * 100, 0), 20)

        aaa_yield = 4.2  # proxy actual
        graham_price = eps * (8.5 + 2 * g) * 4.4 / aaa_yield

        if graham_price and precio_actual:
            upside = ((graham_price - precio_actual) / precio_actual) * 100
            resultado["valor_intrinseco"] = round(graham_price, 2)
            resultado["upside_pct"] = round(upside, 1)

        resultado["precio_actual"] = precio_actual
        resultado["parametros"] = {
            "eps": round(eps, 2),
            "growth_g_pct": round(g, 1),
            "aaa_yield": aaa_yield,
            "formula": "EPS × (8.5 + 2g) × 4.4 / AAA_yield",
        }

    except Exception as e:
        resultado["error"] = str(e)

    return resultado


def calcular_gordon(info: dict) -> dict:
    """
    Modelo Gordon Growth (solo para empresas que pagan dividendos).
    P = D1 / (r - g), donde D1 = dividendo próximo, r = WACC, g = crecimiento div.
    """
    resultado = {
        "metodo": "Gordon Growth",
        "valor_intrinseco": None,
        "precio_actual": None,
        "upside_pct": None,
        "parametros": {},
        "aplica": False,
        "error": None,
    }

    try:
        dividendo = info.get("dividendRate")
        precio_actual = info.get("currentPrice") or info.get("regularMarketPrice")
        beta = info.get("beta", 1.0) or 1.0

        if not dividendo or dividendo <= 0:
            resultado["aplica"] = False
            resultado["error"] = "No paga dividendos"
            resultado["precio_actual"] = precio_actual
            return resultado

        resultado["aplica"] = True

        # WACC como tasa de descuento
        rf = 0.042
        erp = 0.045
        r = rf + beta * erp
        r = max(0.06, min(r, 0.20))

        # Crecimiento del dividendo (estimado = 50% del crecimiento de ganancias)
        earnings_growth = info.get("earningsGrowth") or 0.04
        g = min(max(earnings_growth * 0.5, 0.01), 0.07)

        if r <= g:
            resultado["error"] = "r <= g, modelo no aplica"
            resultado["precio_actual"] = precio_actual
            return resultado

        d1 = dividendo * (1 + g)
        gordon_price = d1 / (r - g)

        if gordon_price and precio_actual:
            upside = ((gordon_price - precio_actual) / precio_actual) * 100
            resultado["valor_intrinseco"] = round(gordon_price, 2)
            resultado["upside_pct"] = round(upside, 1)

        resultado["precio_actual"] = precio_actual
        resultado["parametros"] = {
            "dividendo_actual": round(dividendo, 2),
            "d1": round(d1, 2),
            "r_pct": round(r * 100, 1),
            "g_pct": round(g * 100, 1),
        }

    except Exception as e:
        resultado["error"] = str(e)

    return resultado

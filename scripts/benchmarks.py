# benchmarks.py — Medianas sectoriales estilo Damodaran 2025-2026
# Fuente: estimaciones basadas en datos públicos de mercado

BENCHMARKS = {
    "Technology": {
        "pe": 28.0,
        "ev_ebitda": 20.0,
        "pb": 6.0,
        "ps": 5.5,
        "roe": 0.22,
        "roic": 0.18,
        "debt_equity": 0.45,
        "net_margin": 0.18,
        "gross_margin": 0.55,
    },
    "Healthcare": {
        "pe": 22.0,
        "ev_ebitda": 14.0,
        "pb": 3.5,
        "ps": 3.0,
        "roe": 0.18,
        "roic": 0.14,
        "debt_equity": 0.55,
        "net_margin": 0.14,
        "gross_margin": 0.62,
    },
    "Financial Services": {
        "pe": 13.0,
        "ev_ebitda": None,  # no aplica para bancos
        "pb": 1.4,
        "ps": 2.5,
        "roe": 0.13,
        "roic": 0.10,
        "debt_equity": 1.5,
        "net_margin": 0.22,
        "gross_margin": None,
    },
    "Consumer Cyclical": {
        "pe": 19.0,
        "ev_ebitda": 12.0,
        "pb": 3.0,
        "ps": 1.2,
        "roe": 0.16,
        "roic": 0.12,
        "debt_equity": 0.80,
        "net_margin": 0.07,
        "gross_margin": 0.35,
    },
    "Consumer Defensive": {
        "pe": 21.0,
        "ev_ebitda": 13.0,
        "pb": 4.0,
        "ps": 1.8,
        "roe": 0.20,
        "roic": 0.14,
        "debt_equity": 0.70,
        "net_margin": 0.09,
        "gross_margin": 0.42,
    },
    "Industrials": {
        "pe": 20.0,
        "ev_ebitda": 13.0,
        "pb": 3.2,
        "ps": 1.5,
        "roe": 0.15,
        "roic": 0.11,
        "debt_equity": 0.65,
        "net_margin": 0.08,
        "gross_margin": 0.32,
    },
    "Energy": {
        "pe": 12.0,
        "ev_ebitda": 7.0,
        "pb": 1.8,
        "ps": 1.0,
        "roe": 0.14,
        "roic": 0.10,
        "debt_equity": 0.50,
        "net_margin": 0.08,
        "gross_margin": 0.30,
    },
    "Utilities": {
        "pe": 17.0,
        "ev_ebitda": 10.0,
        "pb": 1.5,
        "ps": 2.0,
        "roe": 0.10,
        "roic": 0.07,
        "debt_equity": 1.20,
        "net_margin": 0.11,
        "gross_margin": 0.40,
    },
    "Real Estate": {
        "pe": 35.0,
        "ev_ebitda": 20.0,
        "pb": 1.8,
        "ps": 5.0,
        "roe": 0.08,
        "roic": 0.06,
        "debt_equity": 0.90,
        "net_margin": 0.20,
        "gross_margin": 0.60,
    },
    "Communication Services": {
        "pe": 18.0,
        "ev_ebitda": 10.0,
        "pb": 2.5,
        "ps": 2.2,
        "roe": 0.16,
        "roic": 0.12,
        "debt_equity": 0.70,
        "net_margin": 0.12,
        "gross_margin": 0.50,
    },
    "Basic Materials": {
        "pe": 14.0,
        "ev_ebitda": 8.0,
        "pb": 2.0,
        "ps": 1.3,
        "roe": 0.13,
        "roic": 0.10,
        "debt_equity": 0.55,
        "net_margin": 0.09,
        "gross_margin": 0.28,
    },
    # Fallback para sectores no reconocidos
    "Default": {
        "pe": 18.0,
        "ev_ebitda": 12.0,
        "pb": 2.5,
        "ps": 2.0,
        "roe": 0.14,
        "roic": 0.11,
        "debt_equity": 0.70,
        "net_margin": 0.10,
        "gross_margin": 0.40,
    },
}


def get_benchmark(sector: str) -> dict:
    """Devuelve la mediana sectorial para el sector dado."""
    return BENCHMARKS.get(sector, BENCHMARKS["Default"])


def compare_to_benchmark(ratios: dict, sector: str) -> dict:
    """
    Compara ratios de la empresa contra las medianas sectoriales.
    Devuelve un dict con la diferencia relativa (positivo = mejor que benchmark).
    """
    benchmark = get_benchmark(sector)
    comparison = {}

    # P/E: más bajo es mejor para el inversor
    if ratios.get("pe") and benchmark.get("pe"):
        diff = (benchmark["pe"] - ratios["pe"]) / benchmark["pe"]
        comparison["pe_vs_sector"] = round(diff * 100, 1)

    # EV/EBITDA: más bajo es mejor
    if ratios.get("ev_ebitda") and benchmark.get("ev_ebitda"):
        diff = (benchmark["ev_ebitda"] - ratios["ev_ebitda"]) / benchmark["ev_ebitda"]
        comparison["ev_ebitda_vs_sector"] = round(diff * 100, 1)

    # P/B: más bajo es mejor
    if ratios.get("pb") and benchmark.get("pb"):
        diff = (benchmark["pb"] - ratios["pb"]) / benchmark["pb"]
        comparison["pb_vs_sector"] = round(diff * 100, 1)

    # ROE: más alto es mejor
    if ratios.get("roe") and benchmark.get("roe"):
        diff = (ratios["roe"] - benchmark["roe"]) / benchmark["roe"]
        comparison["roe_vs_sector"] = round(diff * 100, 1)

    # Margen neto: más alto es mejor
    if ratios.get("net_margin") and benchmark.get("net_margin"):
        diff = (ratios["net_margin"] - benchmark["net_margin"]) / benchmark["net_margin"]
        comparison["net_margin_vs_sector"] = round(diff * 100, 1)

    comparison["benchmark_used"] = benchmark
    comparison["sector"] = sector

    return comparison

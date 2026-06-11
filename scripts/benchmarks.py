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


# ═══════════════════════════════════════════════════════════════════════
# MEDIANAS POR INDUSTRIA (Yahoo Finance industry) — estilo Damodaran 2025
# Mucho más específicas que el sector: TSM se compara contra Semiconductors
# (P/E ~28x) y no contra Technology genérico. Estimaciones educativas
# basadas en datos públicos de mercado. Campos None = no aplica (ej.
# EV/EBITDA en bancos).
# ═══════════════════════════════════════════════════════════════════════

def _bm(pe, ev, pb, ps, roe, roic, de, nm, gm):
    """Helper compacto para definir una mediana de industria en una línea."""
    return {
        "pe": pe, "ev_ebitda": ev, "pb": pb, "ps": ps,
        "roe": roe, "roic": roic, "debt_equity": de,
        "net_margin": nm, "gross_margin": gm,
    }


INDUSTRY_BENCHMARKS = {
    # ── Basic Materials ─────────────────────────────────────────────────
    "Agricultural Inputs":                _bm(16.0,  9.0, 1.8, 1.2, 0.11, 0.08, 0.50, 0.07, 0.28),
    "Aluminum":                           _bm(11.0,  6.0, 1.2, 0.8, 0.10, 0.07, 0.50, 0.05, 0.18),
    "Building Materials":                 _bm(17.0, 10.0, 2.5, 1.6, 0.15, 0.11, 0.50, 0.10, 0.28),
    "Chemicals":                          _bm(16.0,  9.0, 2.0, 1.3, 0.12, 0.09, 0.60, 0.08, 0.25),
    "Specialty Chemicals":                _bm(19.0, 11.0, 2.5, 1.8, 0.13, 0.10, 0.60, 0.10, 0.30),
    "Copper":                             _bm(14.0,  7.0, 1.8, 1.5, 0.12, 0.09, 0.40, 0.10, 0.30),
    "Gold":                               _bm(15.0,  7.5, 1.8, 2.5, 0.10, 0.08, 0.25, 0.12, 0.35),
    "Steel":                              _bm(10.0,  5.5, 1.2, 0.6, 0.10, 0.08, 0.40, 0.06, 0.15),
    "Paper & Paper Products":             _bm(13.0,  7.5, 1.5, 0.9, 0.10, 0.08, 0.70, 0.06, 0.22),
    "Other Industrial Metals & Mining":   _bm(12.0,  6.5, 1.5, 1.2, 0.11, 0.08, 0.40, 0.09, 0.28),
    "Other Precious Metals & Mining":     _bm(16.0,  8.0, 1.6, 2.5, 0.08, 0.06, 0.30, 0.08, 0.32),

    # ── Communication Services ──────────────────────────────────────────
    "Telecom Services":                   _bm(14.0,  7.0, 1.6, 1.5, 0.10, 0.07, 1.20, 0.10, 0.55),
    "Internet Content & Information":     _bm(24.0, 14.0, 4.0, 4.0, 0.18, 0.14, 0.30, 0.18, 0.55),
    "Entertainment":                      _bm(22.0, 11.0, 2.2, 2.0, 0.10, 0.08, 0.80, 0.08, 0.40),
    "Electronic Gaming & Multimedia":     _bm(22.0, 13.0, 3.0, 3.5, 0.14, 0.11, 0.30, 0.15, 0.60),
    "Publishing":                         _bm(14.0,  8.0, 1.5, 1.0, 0.09, 0.07, 0.50, 0.06, 0.40),

    # ── Consumer Cyclical ───────────────────────────────────────────────
    "Apparel Retail":                     _bm(17.0, 10.0, 3.5, 1.0, 0.18, 0.13, 0.80, 0.06, 0.45),
    "Auto & Truck Dealerships":           _bm(12.0,  9.0, 2.0, 0.4, 0.15, 0.10, 1.00, 0.03, 0.16),
    "Auto Manufacturers":                 _bm(10.0,  8.0, 1.3, 0.7, 0.12, 0.08, 0.90, 0.05, 0.18),
    "Auto Parts":                         _bm(13.0,  7.5, 1.8, 0.7, 0.12, 0.09, 0.70, 0.05, 0.20),
    "Department Stores":                  _bm(11.0,  6.0, 1.8, 0.4, 0.12, 0.09, 0.90, 0.03, 0.38),
    "Footwear & Accessories":             _bm(20.0, 13.0, 4.5, 1.8, 0.20, 0.15, 0.50, 0.09, 0.45),
    "Home Improvement Retail":            _bm(20.0, 13.0, 6.0, 1.8, 0.30, 0.18, 1.50, 0.08, 0.33),
    "Internet Retail":                    _bm(25.0, 14.0, 4.0, 1.8, 0.16, 0.12, 0.50, 0.06, 0.40),
    "Packaging & Containers":             _bm(15.0,  9.0, 2.2, 1.0, 0.13, 0.09, 0.90, 0.06, 0.22),
    "Recreational Vehicles":              _bm(13.0,  8.5, 2.0, 0.8, 0.14, 0.10, 0.70, 0.06, 0.22),
    "Resorts & Casinos":                  _bm(20.0, 11.0, 2.8, 2.2, 0.12, 0.08, 1.50, 0.10, 0.45),
    "Restaurants":                        _bm(24.0, 15.0, 5.0, 2.8, 0.22, 0.14, 1.00, 0.10, 0.32),
    "Specialty Retail":                   _bm(16.0, 10.0, 3.0, 0.9, 0.18, 0.12, 0.80, 0.05, 0.35),
    "Travel Services":                    _bm(19.0, 12.0, 3.5, 2.5, 0.18, 0.13, 0.80, 0.12, 0.55),

    # ── Consumer Defensive ──────────────────────────────────────────────
    "Beverages - Brewers":                _bm(18.0, 11.0, 2.5, 2.2, 0.13, 0.09, 0.70, 0.10, 0.45),
    "Beverages - Non-Alcoholic":          _bm(22.0, 15.0, 5.0, 3.5, 0.25, 0.15, 0.80, 0.15, 0.55),
    "Beverages - Wineries & Distilleries":_bm(19.0, 13.0, 2.8, 3.0, 0.13, 0.09, 0.70, 0.14, 0.55),
    "Confectioners":                      _bm(22.0, 14.0, 4.5, 2.8, 0.20, 0.13, 0.70, 0.12, 0.45),
    "Discount Stores":                    _bm(24.0, 14.0, 5.5, 0.9, 0.25, 0.15, 0.80, 0.03, 0.25),
    "Farm Products":                      _bm(13.0,  8.0, 1.6, 0.5, 0.10, 0.08, 0.60, 0.04, 0.15),
    "Food Distribution":                  _bm(16.0, 10.0, 3.5, 0.3, 0.20, 0.11, 1.20, 0.02, 0.14),
    "Household & Personal Products":      _bm(22.0, 14.0, 5.0, 2.8, 0.25, 0.15, 0.70, 0.12, 0.50),
    "Tobacco":                            _bm(14.0, 10.0, 4.0, 3.5, 0.30, 0.18, 1.50, 0.20, 0.60),

    # ── Energy ──────────────────────────────────────────────────────────
    "Oil & Gas E&P":                      _bm(11.0,  5.0, 1.5, 1.8, 0.13, 0.10, 0.40, 0.15, 0.40),
    "Oil & Gas Equipment & Services":     _bm(14.0,  7.0, 2.0, 1.2, 0.12, 0.09, 0.50, 0.08, 0.22),
    "Oil & Gas Integrated":               _bm(11.0,  5.5, 1.5, 0.9, 0.13, 0.10, 0.40, 0.08, 0.30),
    "Oil & Gas Midstream":                _bm(14.0,  9.0, 2.2, 1.8, 0.13, 0.09, 1.20, 0.12, 0.35),
    "Oil & Gas Refining & Marketing":     _bm(12.0,  6.5, 1.8, 0.4, 0.14, 0.10, 0.50, 0.04, 0.12),
    "Uranium":                            _bm(30.0, 16.0, 2.5, 5.0, 0.08, 0.06, 0.30, 0.12, 0.35),

    # ── Financial Services ──────────────────────────────────────────────
    "Asset Management":                   _bm(15.0, None, 2.2, 4.0, 0.15, 0.12, 0.60, 0.25, None),
    "Banks - Diversified":                _bm(11.0, None, 1.2, 2.8, 0.12, 0.10, 1.20, 0.26, None),
    "Banks - Regional":                   _bm(11.0, None, 1.1, 2.6, 0.11, 0.09, 1.00, 0.25, None),
    "Capital Markets":                    _bm(16.0, None, 2.0, 3.5, 0.13, 0.10, 1.50, 0.22, None),
    "Credit Services":                    _bm(16.0, None, 3.5, 3.5, 0.20, 0.13, 1.50, 0.22, None),
    "Financial Data & Stock Exchanges":   _bm(26.0, 17.0, 4.5, 7.0, 0.18, 0.13, 0.70, 0.28, 0.65),
    "Insurance - Diversified":            _bm(12.0, None, 1.4, 1.2, 0.12, 0.09, 0.40, 0.10, None),
    "Insurance - Life":                   _bm(10.0, None, 1.1, 0.9, 0.11, 0.08, 0.50, 0.08, None),
    "Insurance - Property & Casualty":    _bm(14.0, None, 1.8, 1.4, 0.13, 0.10, 0.35, 0.10, None),
    "Mortgage Finance":                   _bm(10.0, None, 1.0, 2.5, 0.10, 0.08, 2.00, 0.20, None),

    # ── Healthcare ──────────────────────────────────────────────────────
    "Biotechnology":                      _bm(22.0, 14.0, 3.5, 5.0, 0.12, 0.09, 0.40, 0.15, 0.80),
    "Diagnostics & Research":             _bm(22.0, 14.0, 3.0, 3.0, 0.13, 0.10, 0.50, 0.10, 0.50),
    "Drug Manufacturers - General":       _bm(17.0, 12.0, 4.0, 3.8, 0.20, 0.14, 0.60, 0.18, 0.70),
    "Drug Manufacturers - Specialty & Generic": _bm(13.0, 9.0, 2.0, 2.0, 0.13, 0.09, 0.70, 0.10, 0.55),
    "Health Information Services":        _bm(25.0, 16.0, 3.5, 3.5, 0.12, 0.09, 0.50, 0.08, 0.55),
    "Healthcare Plans":                   _bm(14.0,  9.0, 2.8, 0.5, 0.18, 0.12, 0.70, 0.04, 0.20),
    "Medical Devices":                    _bm(24.0, 16.0, 4.0, 4.5, 0.15, 0.11, 0.50, 0.14, 0.65),
    "Medical Distribution":               _bm(17.0, 11.0, 5.0, 0.25, 0.25, 0.14, 0.80, 0.012, 0.05),
    "Medical Instruments & Supplies":     _bm(24.0, 16.0, 4.0, 4.5, 0.15, 0.11, 0.50, 0.14, 0.60),

    # ── Industrials ─────────────────────────────────────────────────────
    "Aerospace & Defense":                _bm(23.0, 14.0, 3.5, 1.8, 0.15, 0.11, 0.70, 0.07, 0.22),
    "Airlines":                           _bm( 9.0,  5.5, 2.0, 0.5, 0.18, 0.10, 1.50, 0.04, 0.25),
    "Airports & Air Services":            _bm(18.0, 10.0, 2.5, 3.5, 0.14, 0.09, 1.00, 0.18, 0.45),
    "Building Products & Equipment":      _bm(17.0, 11.0, 3.0, 1.6, 0.17, 0.12, 0.60, 0.09, 0.28),
    "Business Equipment & Supplies":      _bm(14.0,  9.0, 2.5, 1.2, 0.15, 0.11, 0.60, 0.07, 0.35),
    "Conglomerates":                      _bm(17.0, 11.0, 2.2, 1.4, 0.13, 0.09, 0.70, 0.08, 0.30),
    "Consulting Services":                _bm(22.0, 13.0, 4.0, 2.0, 0.20, 0.14, 0.50, 0.09, 0.35),
    "Farm & Heavy Construction Machinery":_bm(15.0, 10.0, 2.8, 1.3, 0.16, 0.11, 0.80, 0.08, 0.25),
    "Integrated Freight & Logistics":     _bm(16.0,  9.0, 2.8, 1.0, 0.16, 0.11, 0.80, 0.06, 0.25),
    "Railroads":                          _bm(19.0, 12.0, 4.5, 4.5, 0.20, 0.12, 0.90, 0.25, 0.45),
    "Rental & Leasing Services":          _bm(14.0,  8.0, 2.5, 1.8, 0.18, 0.10, 1.50, 0.12, 0.40),
    "Specialty Industrial Machinery":     _bm(21.0, 14.0, 4.0, 2.2, 0.17, 0.12, 0.50, 0.11, 0.35),
    "Tools & Accessories":                _bm(18.0, 12.0, 3.0, 1.8, 0.15, 0.11, 0.60, 0.09, 0.34),

    # ── Real Estate ─────────────────────────────────────────────────────
    "REIT - Retail":                      _bm(30.0, 16.0, 1.8, 7.0, 0.08, 0.06, 0.90, 0.25, 0.60),
    "Real Estate Services":               _bm(20.0, 12.0, 2.0, 1.5, 0.10, 0.07, 0.70, 0.08, 0.35),

    # ── Technology ──────────────────────────────────────────────────────
    "Communication Equipment":            _bm(18.0, 12.0, 3.0, 2.5, 0.14, 0.11, 0.40, 0.10, 0.50),
    "Computer Hardware":                  _bm(16.0, 11.0, 3.5, 1.5, 0.20, 0.13, 0.70, 0.06, 0.30),
    "Consumer Electronics":               _bm(22.0, 15.0, 5.0, 2.5, 0.25, 0.17, 0.80, 0.15, 0.40),
    "Electronic Components":              _bm(18.0, 11.0, 2.5, 1.8, 0.13, 0.10, 0.40, 0.08, 0.30),
    "Information Technology Services":    _bm(20.0, 12.0, 3.5, 2.0, 0.18, 0.13, 0.50, 0.10, 0.32),
    "Scientific & Technical Instruments": _bm(24.0, 16.0, 4.0, 4.0, 0.15, 0.11, 0.50, 0.14, 0.50),
    "Semiconductor Equipment & Materials":_bm(25.0, 18.0, 5.5, 6.0, 0.22, 0.17, 0.30, 0.22, 0.45),
    "Semiconductors":                     _bm(28.0, 19.0, 5.0, 7.0, 0.18, 0.14, 0.30, 0.20, 0.50),
    "Software - Application":             _bm(32.0, 22.0, 6.0, 6.0, 0.15, 0.12, 0.40, 0.12, 0.70),
    "Software - Infrastructure":          _bm(32.0, 22.0, 7.0, 8.0, 0.20, 0.15, 0.40, 0.20, 0.75),
    "Solar":                              _bm(18.0, 11.0, 2.0, 1.5, 0.10, 0.08, 0.60, 0.06, 0.22),

    # ── Utilities ───────────────────────────────────────────────────────
    "Utilities - Independent Power Producers": _bm(16.0,  9.0, 2.0, 1.8, 0.11, 0.07, 1.30, 0.10, 0.35),
    "Utilities - Regulated Electric":     _bm(17.0, 10.5, 1.7, 2.2, 0.10, 0.06, 1.30, 0.12, 0.40),
    "Utilities - Regulated Gas":          _bm(16.0, 10.0, 1.7, 1.8, 0.10, 0.06, 1.20, 0.11, 0.40),
    "Utilities - Regulated Water":        _bm(22.0, 13.0, 2.2, 4.5, 0.10, 0.06, 1.10, 0.18, 0.50),
}


def _norm_ind(s: str) -> str:
    """Normaliza nombre de industria para matching robusto.

    Yahoo a veces usa em-dash (—), en-dash (–) o guión simple según la
    versión de la API: unificamos todo a '-' con espacios colapsados.
    """
    s = str(s).strip().lower()
    for dash in ("—", "–"):
        s = s.replace(dash, "-")
    return " ".join(s.replace(" - ", "-").replace("- ", "-").replace(" -", "-").split())


_IND_LOOKUP = {_norm_ind(k): k for k in INDUSTRY_BENCHMARKS}


def get_benchmark_info(sector: str, industry: str = None) -> tuple:
    """Devuelve (benchmark, nombre_grupo, nivel) con el grupo más específico.

    Prioridad: industria de Yahoo (94 cubiertas) → sector (11) → mercado
    general. El 'nivel' permite al frontend decir contra qué se comparó.
    """
    if industry:
        key = _IND_LOOKUP.get(_norm_ind(industry))
        if key:
            return INDUSTRY_BENCHMARKS[key], key, "industria"
    if sector in BENCHMARKS and sector != "Default":
        return BENCHMARKS[sector], sector, "sector"
    return BENCHMARKS["Default"], "Mercado general", "mercado"


def get_benchmark(sector: str, industry: str = None) -> dict:
    """Devuelve la mediana del grupo más específico disponible."""
    return get_benchmark_info(sector, industry)[0]


def compare_to_benchmark(ratios: dict, sector: str, industry: str = None) -> dict:
    """
    Compara ratios de la empresa contra las medianas de su industria
    (o sector si la industria no está cubierta).
    Devuelve un dict con la diferencia relativa (positivo = mejor que benchmark).
    """
    benchmark, bm_nombre, bm_nivel = get_benchmark_info(sector, industry)
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
    comparison["benchmark_nombre"] = bm_nombre   # ej. "Semiconductors"
    comparison["benchmark_nivel"] = bm_nivel     # "industria" | "sector" | "mercado"

    return comparison

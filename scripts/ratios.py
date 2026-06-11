# ratios.py — Cálculo de ratios fundamentales desde datos de yfinance

import math


def safe_div(a, b):
    """División segura que devuelve None si el denominador es 0 o None."""
    if a is None or b is None or b == 0:
        return None
    try:
        result = a / b
        if math.isnan(result) or math.isinf(result):
            return None
        return result
    except Exception:
        return None


def safe_round(val, decimals=2):
    """Redondea de forma segura, devuelve None si el valor no es numérico."""
    if val is None:
        return None
    try:
        if math.isnan(val) or math.isinf(val):
            return None
        return round(float(val), decimals)
    except Exception:
        return None


def pct(val, decimals=2):
    """Convierte fracción a porcentaje PRESERVANDO None.

    Importante: sin dato debe quedar None (la UI muestra N/D y el scoring
    lo trata neutral). Convertir None a 0% inventa un dato falso que
    castiga injustamente a la empresa.
    """
    if val is None:
        return None
    return safe_round(val * 100, decimals)


def calcular_valoracion(info: dict, financials: dict) -> dict:
    """Calcula ratios de valoración."""
    # EV/EBITDA negativo tiene dos causas opuestas: EBITDA < 0 (pérdidas,
    # malo) o EV < 0 (más caja que market cap, rarísimo y de hecho bueno).
    # Si el negativo viene por EV, el múltiplo no es interpretable: None.
    # La posición de caja ya se premia en salud vía Deuda Neta/EBITDA < 0.
    ev_ebitda = info.get("enterpriseToEbitda")
    ebitda = info.get("ebitda")
    if ev_ebitda is not None and ev_ebitda < 0 and ebitda and ebitda > 0:
        ev_ebitda = None

    return {
        "pe": safe_round(info.get("trailingPE")),
        "forward_pe": safe_round(info.get("forwardPE")),
        "peg": safe_round(info.get("pegRatio") or info.get("trailingPegRatio")),
        "pb": safe_round(info.get("priceToBook")),
        "ps": safe_round(info.get("priceToSalesTrailing12Months")),
        "ev_ebitda": safe_round(ev_ebitda),
        "ev_revenue": safe_round(info.get("enterpriseToRevenue")),
        # yfinance >= 0.2.54 ya devuelve dividendYield en porcentaje (2.6 = 2.6%)
        "dividend_yield": safe_round(info.get("dividendYield")),
        # payoutRatio sigue siendo fracción (0.65 = 65%)
        "payout_ratio": pct(info.get("payoutRatio")),
    }


def calcular_rentabilidad(info: dict) -> dict:
    """Calcula ratios de rentabilidad."""
    # ROIC aproximado = EBIT * (1 - tax_rate) / (total_debt + equity)
    ebit = info.get("ebit")
    tax = info.get("effectiveTaxRate", 0.25) or 0.25
    total_debt = info.get("totalDebt", 0) or 0
    equity = info.get("bookValue", 0) or 0
    shares = info.get("sharesOutstanding", 1) or 1
    equity_total = equity * shares

    invested_capital = total_debt + equity_total
    roic = safe_div(ebit * (1 - tax), invested_capital) if ebit else None

    return {
        "roe": pct(info.get("returnOnEquity")),
        "roa": pct(info.get("returnOnAssets")),
        "roic": pct(roic),
        "gross_margin": pct(info.get("grossMargins")),
        "operating_margin": pct(info.get("operatingMargins")),
        "net_margin": pct(info.get("profitMargins")),
    }


def calcular_solvencia(info: dict) -> dict:
    """Calcula ratios de solvencia y liquidez."""
    ebitda = info.get("ebitda")
    net_debt = (info.get("totalDebt", 0) or 0) - (info.get("totalCash", 0) or 0)
    # Con EBITDA negativo el ratio no es interpretable (un valor negativo
    # parecería "caja neta" cuando en realidad la empresa pierde plata)
    net_debt_ebitda = safe_div(net_debt, ebitda) if ebitda and ebitda > 0 else None

    return {
        "debt_equity": safe_round(info.get("debtToEquity")),
        "net_debt_ebitda": safe_round(net_debt_ebitda),
        "current_ratio": safe_round(info.get("currentRatio")),
        "quick_ratio": safe_round(info.get("quickRatio")),
        "total_debt": info.get("totalDebt"),
        "total_cash": info.get("totalCash"),
        "net_debt": safe_round(net_debt),
    }


def calcular_crecimiento(info: dict) -> dict:
    """Calcula métricas de crecimiento."""
    return {
        "revenue_growth": pct(info.get("revenueGrowth")),
        "earnings_growth": pct(info.get("earningsGrowth")),
        "earnings_quarterly_growth": pct(info.get("earningsQuarterlyGrowth")),
    }


def calcular_cashflow(info: dict) -> dict:
    """Calcula métricas de flujo de caja libre."""
    fcf = info.get("freeCashflow")
    net_income = info.get("netIncomeToCommon")
    market_cap = info.get("marketCap")

    fcf_ni_ratio = safe_div(fcf, net_income)
    fcf_yield = safe_div(fcf, market_cap)

    return {
        "free_cashflow": fcf,
        "fcf_ni_ratio": safe_round(fcf_ni_ratio),
        "fcf_yield": pct(fcf_yield),
        "operating_cashflow": info.get("operatingCashflow"),
    }

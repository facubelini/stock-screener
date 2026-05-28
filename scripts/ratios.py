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


def calcular_valoracion(info: dict, financials: dict) -> dict:
    """Calcula ratios de valoración."""
    return {
        "pe": safe_round(info.get("trailingPE")),
        "forward_pe": safe_round(info.get("forwardPE")),
        "peg": safe_round(info.get("pegRatio")),
        "pb": safe_round(info.get("priceToBook")),
        "ps": safe_round(info.get("priceToSalesTrailing12Months")),
        "ev_ebitda": safe_round(info.get("enterpriseToEbitda")),
        "ev_revenue": safe_round(info.get("enterpriseToRevenue")),
        "dividend_yield": safe_round(
            (info.get("dividendYield") or 0) * 100, 2
        ),
        "payout_ratio": safe_round(
            (info.get("payoutRatio") or 0) * 100, 2
        ),
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
        "roe": safe_round((info.get("returnOnEquity") or 0) * 100, 2),
        "roa": safe_round((info.get("returnOnAssets") or 0) * 100, 2),
        "roic": safe_round((roic or 0) * 100, 2),
        "gross_margin": safe_round((info.get("grossMargins") or 0) * 100, 2),
        "operating_margin": safe_round((info.get("operatingMargins") or 0) * 100, 2),
        "net_margin": safe_round((info.get("profitMargins") or 0) * 100, 2),
    }


def calcular_solvencia(info: dict) -> dict:
    """Calcula ratios de solvencia y liquidez."""
    ebitda = info.get("ebitda")
    net_debt = (info.get("totalDebt", 0) or 0) - (info.get("totalCash", 0) or 0)
    net_debt_ebitda = safe_div(net_debt, ebitda)

    return {
        "debt_equity": safe_round(info.get("debtToEquity")),
        "net_debt_ebitda": safe_round(net_debt_ebitda),
        "current_ratio": safe_round(info.get("currentRatio")),
        "quick_ratio": safe_round(info.get("quickRatio")),
        "interest_coverage": safe_round(info.get("coverageRatio")),
        "total_debt": info.get("totalDebt"),
        "total_cash": info.get("totalCash"),
        "net_debt": safe_round(net_debt),
    }


def calcular_crecimiento(info: dict) -> dict:
    """Calcula métricas de crecimiento."""
    return {
        "revenue_growth": safe_round(
            (info.get("revenueGrowth") or 0) * 100, 2
        ),
        "earnings_growth": safe_round(
            (info.get("earningsGrowth") or 0) * 100, 2
        ),
        "earnings_quarterly_growth": safe_round(
            (info.get("earningsQuarterlyGrowth") or 0) * 100, 2
        ),
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
        "fcf_yield": safe_round((fcf_yield or 0) * 100, 2),
        "operating_cashflow": info.get("operatingCashflow"),
    }

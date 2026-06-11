# scoring.py — Sistema de puntuación 0-100 y veredictos

from benchmarks import get_benchmark


def clamp(val, min_val=0, max_val=100):
    """Limita un valor entre min y max."""
    if val is None:
        return 50  # neutral por defecto
    return max(min_val, min(max_val, val))


def score_ratio_vs_benchmark(valor, benchmark, menor_es_mejor=True, score_si_negativo=15):
    """
    Puntúa un ratio comparándolo contra el benchmark sectorial.
    Devuelve 0-100 donde 100 = mucho mejor que el sector.

    score_si_negativo: qué devolver si el ratio es negativo en métricas
    "menor es mejor". Un P/E o EV/EBITDA negativo significa pérdidas (malo,
    15), NUNCA baratura — sin este guard, -5/28 <= 0.5 puntuaba 95 y una
    empresa con pérdidas salía como BARATA. Para P/B o D/E con equity
    negativo el ratio no es interpretable → pasar 50 (neutral).
    """
    if valor is None or benchmark is None or benchmark == 0:
        return 50  # neutral si no hay datos

    if menor_es_mejor and valor < 0:
        return score_si_negativo

    ratio = valor / benchmark

    if menor_es_mejor:
        # P/E, EV/EBITDA, P/B, D/E: más bajo = mejor
        if ratio <= 0.5:
            return 95
        elif ratio <= 0.75:
            return 80
        elif ratio <= 1.0:
            return 65
        elif ratio <= 1.25:
            return 45
        elif ratio <= 1.5:
            return 30
        else:
            return 10
    else:
        # ROE, ROIC, márgenes: más alto = mejor
        if ratio >= 1.5:
            return 95
        elif ratio >= 1.25:
            return 80
        elif ratio >= 1.0:
            return 65
        elif ratio >= 0.75:
            return 45
        elif ratio >= 0.5:
            return 30
        else:
            return 10


def score_upside(upside_pct):
    """Puntúa el upside vs valor intrínseco."""
    if upside_pct is None:
        return 50
    if upside_pct >= 50:
        return 100
    elif upside_pct >= 30:
        return 85
    elif upside_pct >= 15:
        return 70
    elif upside_pct >= 0:
        return 55
    elif upside_pct >= -15:
        return 35
    elif upside_pct >= -30:
        return 20
    else:
        return 5


def calcular_score(ratios: dict, valuacion: dict, sector: str) -> dict:
    """
    Calcula el score global 0-100 y los veredictos.

    Componentes:
    - Valoración 40%: P/E, EV/EBITDA, P/B vs benchmark + upside DCF/Graham
    - Calidad 40%: ROE, ROIC, márgenes, crecimiento FCF
    - Salud financiera 20%: D/E, Interest Coverage, Current Ratio
    """
    benchmark = get_benchmark(sector)

    # ── VALORACIÓN (40%) ─────────────────────────────────────────────────────
    val_scores = []

    # Ratios de valoración vs benchmark
    pe = ratios.get("valoracion", {}).get("pe")
    pe_bm = benchmark.get("pe")
    val_scores.append(score_ratio_vs_benchmark(pe, pe_bm, menor_es_mejor=True))

    ev_ebitda = ratios.get("valoracion", {}).get("ev_ebitda")
    ev_bm = benchmark.get("ev_ebitda")
    val_scores.append(score_ratio_vs_benchmark(ev_ebitda, ev_bm, menor_es_mejor=True))

    pb = ratios.get("valoracion", {}).get("pb")
    pb_bm = benchmark.get("pb")
    # P/B negativo = equity negativo (común tras buybacks masivos): neutral
    val_scores.append(score_ratio_vs_benchmark(pb, pb_bm, menor_es_mejor=True, score_si_negativo=50))

    # Upside DCF y Graham
    dcf = valuacion.get("dcf", {})
    graham = valuacion.get("graham", {})
    upsides = []
    if dcf.get("upside_pct") is not None:
        upsides.append(dcf["upside_pct"])
    if graham.get("upside_pct") is not None:
        upsides.append(graham["upside_pct"])

    if upsides:
        avg_upside = sum(upsides) / len(upsides)
        val_scores.append(score_upside(avg_upside))
    else:
        val_scores.append(50)

    score_valoracion = sum(val_scores) / len(val_scores)

    # ── CALIDAD (40%) ─────────────────────────────────────────────────────────
    cal_scores = []

    roe = ratios.get("rentabilidad", {}).get("roe")
    roe_bm = (benchmark.get("roe") or 0.14) * 100
    cal_scores.append(score_ratio_vs_benchmark(roe, roe_bm, menor_es_mejor=False))

    roic = ratios.get("rentabilidad", {}).get("roic")
    roic_bm = (benchmark.get("roic") or 0.11) * 100
    cal_scores.append(score_ratio_vs_benchmark(roic, roic_bm, menor_es_mejor=False))

    net_margin = ratios.get("rentabilidad", {}).get("net_margin")
    nm_bm = (benchmark.get("net_margin") or 0.10) * 100
    cal_scores.append(score_ratio_vs_benchmark(net_margin, nm_bm, menor_es_mejor=False))

    gross_margin = ratios.get("rentabilidad", {}).get("gross_margin")
    gm_bm = (benchmark.get("gross_margin") or 0.40) * 100
    cal_scores.append(score_ratio_vs_benchmark(gross_margin, gm_bm, menor_es_mejor=False))

    # Crecimiento de revenue
    rev_growth = ratios.get("crecimiento", {}).get("revenue_growth")
    if rev_growth is not None:
        if rev_growth >= 20:
            cal_scores.append(90)
        elif rev_growth >= 10:
            cal_scores.append(75)
        elif rev_growth >= 5:
            cal_scores.append(60)
        elif rev_growth >= 0:
            cal_scores.append(45)
        else:
            cal_scores.append(20)
    else:
        cal_scores.append(50)

    score_calidad = sum(cal_scores) / len(cal_scores)

    # ── SALUD FINANCIERA (20%) ────────────────────────────────────────────────
    sal_scores = []

    de = ratios.get("solvencia", {}).get("debt_equity")
    de_bm = (benchmark.get("debt_equity") or 0.70) * 100  # yfinance da en %
    if de is not None:
        # D/E negativo = equity negativo, no interpretable: neutral
        sal_scores.append(score_ratio_vs_benchmark(de, de_bm, menor_es_mejor=True, score_si_negativo=50))
    else:
        sal_scores.append(50)

    current_ratio = ratios.get("solvencia", {}).get("current_ratio")
    if current_ratio is not None:
        if current_ratio >= 2.0:
            sal_scores.append(90)
        elif current_ratio >= 1.5:
            sal_scores.append(75)
        elif current_ratio >= 1.0:
            sal_scores.append(55)
        else:
            sal_scores.append(20)
    else:
        sal_scores.append(50)

    # Deuda Neta / EBITDA: cuántos años de EBITDA harían falta para pagar
    # la deuda neta. Negativo = caja neta (más efectivo que deuda).
    nd_ebitda = ratios.get("solvencia", {}).get("net_debt_ebitda")
    if nd_ebitda is not None:
        if nd_ebitda < 0:
            sal_scores.append(95)
        elif nd_ebitda <= 1.5:
            sal_scores.append(85)
        elif nd_ebitda <= 3.0:
            sal_scores.append(65)
        elif nd_ebitda <= 4.5:
            sal_scores.append(40)
        else:
            sal_scores.append(15)
    else:
        sal_scores.append(50)

    score_salud = sum(sal_scores) / len(sal_scores)

    # ── SCORE GLOBAL ──────────────────────────────────────────────────────────
    score_global = (
        score_valoracion * 0.40
        + score_calidad * 0.40
        + score_salud * 0.20
    )

    # ── SIN DATOS: no emitir veredicto sin evidencia de valoración ────────────
    # Si no hay NINGÚN múltiplo ni upside, el veredicto saldría "JUSTA" por
    # puro default (todos los componentes en 50). Eso es una señal falsa:
    # mejor decir explícitamente que no hay datos suficientes.
    datos_valoracion = sum(
        x is not None for x in [pe, ev_ebitda, pb]
    ) + (1 if upsides else 0)

    if datos_valoracion == 0:
        return {
            "score_global": None,
            "score_valoracion": None,
            "score_calidad": round(clamp(score_calidad), 1),
            "score_salud": round(clamp(score_salud), 1),
            "veredicto": "SIN DATOS",
            "señal": "DATOS INSUFICIENTES",
        }

    # ── VEREDICTOS ─────────────────────────────────────────────────────────────
    if score_valoracion >= 70:
        veredicto = "BARATA"
    elif score_valoracion >= 40:
        veredicto = "JUSTA"
    else:
        veredicto = "CARA"

    # Señal combinada
    if score_calidad >= 60 and veredicto == "BARATA":
        señal = "OPORTUNIDAD DE COMPRA"
    elif score_calidad >= 60 and veredicto == "JUSTA":
        señal = "COMPRA MODERADA"
    elif score_calidad >= 40 and veredicto != "CARA":
        señal = "MANTENER"
    elif veredicto == "CARA":
        señal = "EVITAR"
    elif score_calidad < 40:
        señal = "EVITAR"
    else:
        señal = "MANTENER"

    return {
        "score_global": round(clamp(score_global), 1),
        "score_valoracion": round(clamp(score_valoracion), 1),
        "score_calidad": round(clamp(score_calidad), 1),
        "score_salud": round(clamp(score_salud), 1),
        "veredicto": veredicto,
        "señal": señal,
    }

# Stock Screener — Análisis Fundamental

Dashboard público de análisis fundamental de acciones, actualizado automáticamente cada día.

**URL pública:** https://facubelini.github.io/stock-screener/

---

## ¿Qué hace este screener?

Para cada ticker en `tickers.xlsx`, calcula y muestra:

- **Ratios de valoración**: P/E, Forward P/E, PEG, P/B, P/S, EV/EBITDA, Dividend Yield, Payout Ratio.
- **Rentabilidad**: ROE, ROA, ROIC, márgenes bruto/operativo/neto.
- **Solvencia**: Debt/Equity, Net Debt/EBITDA, Current Ratio, Quick Ratio, Interest Coverage.
- **Crecimiento**: Revenue Growth, Earnings Growth.
- **Cash Flow**: FCF, FCF Yield, FCF/Net Income.
- **Valor intrínseco**: DCF (5 años + terminal), Graham Number, Gordon Growth Model.
- **Comparación sectorial**: vs. medianas estilo Damodaran 2025-2026.
- **Score 0-100** y veredicto: BARATA / JUSTA / CARA.
- **Señal**: OPORTUNIDAD DE COMPRA / COMPRA MODERADA / MANTENER / EVITAR.

Los datos se actualizan diariamente a las **06:00 UTC** vía GitHub Actions.

---

## Cómo editar la lista de tickers

### Opción A — Vía web (sin instalar nada)

1. Abrí el repo en GitHub: https://github.com/facubelini/stock-screener
2. Hacé click en `tickers.xlsx`.
3. Botón **"Download raw file"** para descargarlo.
4. Editalo en Excel o Google Sheets.
5. En GitHub, hacé click en el ícono de edición (lápiz) → subí el archivo nuevo.
6. Hacé commit directamente en `main`.
7. El workflow se dispara automáticamente y actualiza los datos en ~5 minutos.

### Opción B — Vía git (recomendado)

```bash
git clone https://github.com/facubelini/stock-screener.git
cd stock-screener

# Editá tickers.xlsx en Excel o LibreOffice
# Asegurate de mantener la hoja llamada "Tickers" con las columnas:
# Ticker | Nombre | Categoria | Notas

git add tickers.xlsx
git commit -m "actualizar tickers"
git push
# El workflow se dispara automáticamente
```

### Formato del Excel

| Columna | Obligatorio | Descripción |
|---------|-------------|-------------|
| `Ticker` | Sí | Símbolo bursátil exacto (AAPL, GGAL, BRK-B, etc.) |
| `Nombre` | No | Nombre legible de la empresa |
| `Categoria` | No | Para agrupar en el dashboard (ej. "Tech US", "ADRs Argentinos") |
| `Notas` | No | Texto libre, se muestra en la card del dashboard |

---

## Cómo forzar una actualización manual

Desde GitHub: **Actions → "Actualizar datos del screener" → "Run workflow"**.

O desde la terminal:
```bash
gh workflow run update.yml
gh run watch  # seguí el progreso
```

---

## Customizar benchmarks sectoriales

Editá `scripts/benchmarks.py` para ajustar las medianas sectoriales usadas como referencia:

```python
BENCHMARKS = {
    "Technology": {
        "pe": 28.0,
        "ev_ebitda": 20.0,
        "pb": 6.0,
        "roe": 0.22,
        # ...
    },
    # Agregá o modificá sectores según tu criterio
}
```

---

## Customizar parámetros del DCF

Editá `scripts/valuation.py` para ajustar:

```python
rf = 0.042        # Tasa libre de riesgo (US 10Y Treasury)
erp = 0.045       # Prima de riesgo de mercado
g_terminal = 0.025  # Crecimiento terminal perpetuo
# Tasa de crecimiento máxima: 12% (hardcodeado como techo)
```

---

## Limitaciones conocidas

- **yfinance puede tener gaps**: algunos campos pueden faltar o estar desactualizados, especialmente para small-caps.
- **Small-caps argentinas locales no cubiertas**: los tickers que aparecen en BYMA pero no en NYSE/NASDAQ pueden no funcionar. Usar ADRs (GGAL, BMA, PAM, YPF) en lugar de tickers locales.
- **Datos con delay**: yfinance usa datos de Yahoo Finance, que pueden tener entre 15 minutos y 24 horas de delay según el mercado.
- **DCF es una estimación**: el valor intrínseco calculado es una aproximación basada en datos disponibles públicamente. No es una valuación profesional.
- **Sectores**: la clasificación sectorial viene de Yahoo Finance y puede diferir de GICS u otros sistemas.
- **Tickers que fallan**: si un ticker no devuelve datos, se muestra con error en el dashboard pero no rompe el análisis de los demás.

---

## Estructura del proyecto

```
/
├── .github/workflows/update.yml   # GitHub Actions: cron diario + dispatch
├── scripts/
│   ├── analyze.py                 # Script principal, genera data.json
│   ├── ratios.py                  # Cálculo de ratios fundamentales
│   ├── valuation.py               # DCF, Graham, Gordon
│   ├── scoring.py                 # Score 0-100 y veredictos
│   └── benchmarks.py              # Medianas sectoriales Damodaran 2025-2026
├── tickers.xlsx                   # Lista editable de tickers
├── docs/
│   ├── index.html                 # Frontend del dashboard
│   ├── styles.css                 # Estilos dark terminal
│   ├── app.js                     # Lógica del dashboard
│   └── data.json                  # Generado por el workflow (no editar)
├── requirements.txt               # Dependencias Python
└── README.md                      # Este archivo
```

---

## Disclaimer legal

**IMPORTANTE**: Este screener es una herramienta de análisis cuantitativo para uso **educativo e informativo únicamente**. No constituye asesoramiento financiero, recomendación de inversión ni consejo profesional de ningún tipo.

Los datos pueden contener errores, estar desactualizados o ser incompletos. Las valuaciones intrínsecas son estimaciones basadas en modelos matemáticos y supuestos que pueden no reflejar la realidad del mercado.

**Nunca tomes decisiones de inversión basándote exclusivamente en esta herramienta.** Consultá con un asesor financiero certificado antes de invertir.

El autor no se responsabiliza por pérdidas derivadas del uso de esta información.

// app.js — Stock Screener Frontend
'use strict';

// ═══════════════════════════════════════════════════════════════════════
// RATIO REFERENCE VALUES
// Umbrales de referencia para interpretar cada ratio fundamental.
// ═══════════════════════════════════════════════════════════════════════
const RATIO_REFS = {
  pe: {
    label: 'P/E Ratio',
    desc: 'Precio sobre Ganancias por acción. Cuánto se paga por cada $1 de ganancia.',
    lowerIsBetter: true,
    negative: { label: 'Negativo — la empresa tiene pérdidas', cls: 'ref-bad' },
    thresholds: [
      { max: 10,       label: 'Muy barato',  cls: 'ref-great' },
      { max: 15,       label: 'Barato',       cls: 'ref-good' },
      { max: 25,       label: 'Razonable',    cls: 'ref-neutral' },
      { max: 35,       label: 'Elevado',      cls: 'ref-warn' },
      { max: Infinity, label: 'Muy caro',     cls: 'ref-bad' },
    ],
    note: 'S&P 500 histórico: ~16-18x. Varía mucho por sector. Tech puede justificar 30-40x con alto crecimiento. P/E negativo = pérdidas, no baratura.',
  },
  forward_pe: {
    label: 'Forward P/E',
    desc: 'P/E basado en ganancias estimadas para los próximos 12 meses.',
    lowerIsBetter: true,
    negative: { label: 'Negativo — se esperan pérdidas', cls: 'ref-bad' },
    thresholds: [
      { max: 12,       label: 'Muy barato',  cls: 'ref-great' },
      { max: 18,       label: 'Razonable',    cls: 'ref-neutral' },
      { max: 28,       label: 'Elevado',      cls: 'ref-warn' },
      { max: Infinity, label: 'Muy caro',     cls: 'ref-bad' },
    ],
    note: 'Mejor predictor que el P/E trailing. Si Forward P/E < P/E, el mercado espera crecimiento.',
  },
  peg: {
    label: 'PEG Ratio',
    desc: 'P/E dividido por tasa de crecimiento de ganancias. Ajusta la valoración por crecimiento.',
    lowerIsBetter: true,
    negative: { label: 'Negativo — pérdidas o crecimiento negativo', cls: 'ref-bad' },
    thresholds: [
      { max: 0.75,     label: 'Infravalorada', cls: 'ref-great' },
      { max: 1.0,      label: 'Justa',          cls: 'ref-good' },
      { max: 1.5,      label: 'Razonable',      cls: 'ref-neutral' },
      { max: 2.0,      label: 'Elevada',         cls: 'ref-warn' },
      { max: Infinity, label: 'Cara',            cls: 'ref-bad' },
    ],
    note: 'PEG < 1: el mercado subestima el crecimiento futuro. Popularizado por Peter Lynch.',
  },
  pb: {
    label: 'P/B (Price-to-Book)',
    desc: 'Precio sobre Valor Libro. Cuánto se paga por encima de los activos netos.',
    lowerIsBetter: true,
    negative: { label: 'No significativo — patrimonio neto negativo', cls: 'ref-neutral' },
    thresholds: [
      { max: 1.0,      label: 'Muy barato',  cls: 'ref-great' },
      { max: 2.0,      label: 'Barato',       cls: 'ref-good' },
      { max: 4.0,      label: 'Razonable',    cls: 'ref-neutral' },
      { max: 7.0,      label: 'Elevado',      cls: 'ref-warn' },
      { max: Infinity, label: 'Muy caro',     cls: 'ref-bad' },
    ],
    note: 'Bancos: < 1.5 es aceptable. Tech puede justificar P/B alto por intangibles. P/B negativo (equity negativo por buybacks, ej. Altria) no es interpretable.',
  },
  ps: {
    label: 'P/S (Price-to-Sales)',
    desc: 'Precio sobre Ventas. Útil para empresas sin ganancias aún.',
    lowerIsBetter: true,
    thresholds: [
      { max: 1.0,      label: 'Muy barato',  cls: 'ref-great' },
      { max: 2.5,      label: 'Razonable',    cls: 'ref-neutral' },
      { max: 5.0,      label: 'Elevado',      cls: 'ref-warn' },
      { max: Infinity, label: 'Muy caro',     cls: 'ref-bad' },
    ],
    note: 'SaaS en crecimiento puede justificar P/S > 10x. Para industriales o retail, > 2x es caro.',
  },
  ev_ebitda: {
    label: 'EV/EBITDA',
    desc: 'Valor Empresa sobre EBITDA. Neutral a estructura de capital e impuestos.',
    lowerIsBetter: true,
    negative: { label: 'Negativo — EBITDA negativo (pérdidas operativas)', cls: 'ref-bad' },
    thresholds: [
      { max: 6,        label: 'Muy barato',  cls: 'ref-great' },
      { max: 10,       label: 'Barato',       cls: 'ref-good' },
      { max: 15,       label: 'Razonable',    cls: 'ref-neutral' },
      { max: 25,       label: 'Elevado',      cls: 'ref-warn' },
      { max: Infinity, label: 'Muy caro',     cls: 'ref-bad' },
    ],
    note: 'Mejor que P/E para comparar empresas con diferente deuda o régimen fiscal. M&A suele usar este múltiplo.',
  },
  dividend_yield: {
    label: 'Dividend Yield',
    desc: 'Dividendo anual / Precio de mercado. Rendimiento por dividendo.',
    lowerIsBetter: false,
    thresholds: [
      { max: 0,        label: 'Sin dividendo', cls: 'ref-neutral' },
      { max: 1.5,      label: 'Bajo',           cls: 'ref-warn' },
      { max: 3.0,      label: 'Moderado',        cls: 'ref-neutral' },
      { max: 5.0,      label: 'Atractivo',       cls: 'ref-good' },
      { max: 8.0,      label: 'Alto',            cls: 'ref-great' },
      { max: Infinity, label: 'Posible trampa',  cls: 'ref-warn' },
    ],
    note: 'Yield > 8% puede indicar que el mercado descuenta un recorte de dividendo. Verificar payout ratio.',
  },
  payout_ratio: {
    label: 'Payout Ratio',
    desc: '% de ganancias netas distribuidas como dividendo.',
    lowerIsBetter: true,
    negative: { label: 'No significativo — paga dividendo con EPS negativo', cls: 'ref-warn' },
    thresholds: [
      { max: 30,       label: 'Muy sostenible', cls: 'ref-great' },
      { max: 55,       label: 'Sostenible',      cls: 'ref-good' },
      { max: 75,       label: 'Moderado',         cls: 'ref-neutral' },
      { max: 90,       label: 'Elevado',          cls: 'ref-warn' },
      { max: Infinity, label: 'Insostenible',     cls: 'ref-bad' },
    ],
    note: 'REITs y utilities con > 70% es normal por su estructura. En otros sectores sugiere poca reinversión.',
  },
  roe: {
    label: 'ROE — Return on Equity',
    desc: 'Ganancia neta / Patrimonio neto. Rentabilidad sobre capital propio.',
    lowerIsBetter: false,
    thresholds: [
      { max: 5,        label: 'Bajo',        cls: 'ref-bad' },
      { max: 10,       label: 'Aceptable',    cls: 'ref-warn' },
      { max: 20,       label: 'Bueno',        cls: 'ref-neutral' },
      { max: 30,       label: 'Muy bueno',    cls: 'ref-good' },
      { max: Infinity, label: 'Excelente',    cls: 'ref-great' },
    ],
    note: 'Buffett busca ROE > 15% sostenido por años. ROE muy alto con mucha deuda puede ser engañoso.',
  },
  roa: {
    label: 'ROA — Return on Assets',
    desc: 'Ganancia neta / Activos totales. Eficiencia en uso de todos los recursos.',
    lowerIsBetter: false,
    thresholds: [
      { max: 2,        label: 'Bajo',        cls: 'ref-bad' },
      { max: 5,        label: 'Aceptable',    cls: 'ref-warn' },
      { max: 10,       label: 'Bueno',        cls: 'ref-neutral' },
      { max: 15,       label: 'Muy bueno',    cls: 'ref-good' },
      { max: Infinity, label: 'Excelente',    cls: 'ref-great' },
    ],
    note: 'Bancos: ROA > 1% es bueno (usan mucho apalancamiento). Industriales: buscar > 5%.',
  },
  roic: {
    label: 'ROIC — Return on Invested Capital',
    desc: 'NOPAT / Capital invertido. El mejor indicador de rentabilidad real del negocio.',
    lowerIsBetter: false,
    thresholds: [
      { max: 5,        label: 'Bajo',        cls: 'ref-bad' },
      { max: 8,        label: 'Aceptable',    cls: 'ref-warn' },
      { max: 15,       label: 'Bueno',        cls: 'ref-neutral' },
      { max: 25,       label: 'Muy bueno',    cls: 'ref-good' },
      { max: Infinity, label: 'Excelente',    cls: 'ref-great' },
    ],
    note: 'ROIC > WACC crea valor para el accionista. Es el ratio favorito de Buffett y Munger para evaluar calidad.',
  },
  gross_margin: {
    label: 'Margen Bruto',
    desc: '(Ventas − COGS) / Ventas. Rentabilidad antes de gastos operativos.',
    lowerIsBetter: false,
    thresholds: [
      { max: 15,       label: 'Muy bajo',    cls: 'ref-bad' },
      { max: 30,       label: 'Bajo',        cls: 'ref-warn' },
      { max: 50,       label: 'Moderado',    cls: 'ref-neutral' },
      { max: 70,       label: 'Alto',        cls: 'ref-good' },
      { max: Infinity, label: 'Muy alto',    cls: 'ref-great' },
    ],
    note: 'Software/pharma: > 70% normal. Retail/commodities: < 30% normal. Siempre comparar dentro del sector.',
  },
  operating_margin: {
    label: 'Margen Operativo',
    desc: 'EBIT / Ventas. Eficiencia antes de intereses e impuestos.',
    lowerIsBetter: false,
    thresholds: [
      { max: 3,        label: 'Muy bajo',    cls: 'ref-bad' },
      { max: 8,        label: 'Bajo',        cls: 'ref-warn' },
      { max: 15,       label: 'Bueno',       cls: 'ref-neutral' },
      { max: 25,       label: 'Muy bueno',   cls: 'ref-good' },
      { max: Infinity, label: 'Excelente',   cls: 'ref-great' },
    ],
    note: 'Margen operativo creciente trimestre a trimestre indica mejora de eficiencia. Comparar YoY.',
  },
  net_margin: {
    label: 'Margen Neto',
    desc: 'Ganancia Neta / Ventas. La línea final después de todo.',
    lowerIsBetter: false,
    thresholds: [
      { max: 2,        label: 'Muy bajo',    cls: 'ref-bad' },
      { max: 6,        label: 'Bajo',        cls: 'ref-warn' },
      { max: 12,       label: 'Bueno',       cls: 'ref-neutral' },
      { max: 22,       label: 'Muy bueno',   cls: 'ref-good' },
      { max: Infinity, label: 'Excelente',   cls: 'ref-great' },
    ],
    note: 'Varía enormemente: bancos 15-25%, retail 3-5%, software 20-35%, oil & gas 5-10%.',
  },
  debt_equity: {
    label: 'Debt/Equity',
    desc: 'Deuda total / Patrimonio neto. Nivel de apalancamiento financiero.',
    lowerIsBetter: true,
    negative: { label: 'No significativo — patrimonio neto negativo', cls: 'ref-neutral' },
    thresholds: [
      { max: 0.3,      label: 'Muy bajo',    cls: 'ref-great' },
      { max: 0.8,      label: 'Moderado',    cls: 'ref-good' },
      { max: 1.5,      label: 'Elevado',     cls: 'ref-neutral' },
      { max: 3.0,      label: 'Alto',        cls: 'ref-warn' },
      { max: Infinity, label: 'Muy alto',    cls: 'ref-bad' },
    ],
    note: 'D/E de 1.0x = la deuda iguala al patrimonio. Utilities y bancos toleran más deuda por la naturaleza de su negocio.',
  },
  net_debt_ebitda: {
    label: 'Deuda Neta / EBITDA',
    desc: 'Años que tardaría en pagar la deuda neta usando todo el EBITDA.',
    lowerIsBetter: true,
    thresholds: [
      { max: 0,        label: 'Caja neta',   cls: 'ref-great' },
      { max: 1.5,      label: 'Muy bajo',    cls: 'ref-good' },
      { max: 3.0,      label: 'Moderado',    cls: 'ref-neutral' },
      { max: 5.0,      label: 'Alto',        cls: 'ref-warn' },
      { max: Infinity, label: 'Peligroso',   cls: 'ref-bad' },
    ],
    note: 'S&P 500 promedio ~2x. Agencias consideran > 4x como speculative-grade. < 0 = más caja que deuda.',
  },
  current_ratio: {
    label: 'Current Ratio',
    desc: 'Activos corrientes / Pasivos corrientes. Capacidad de pagar deuda a corto plazo.',
    lowerIsBetter: false,
    thresholds: [
      { max: 0.8,      label: 'Riesgo',      cls: 'ref-bad' },
      { max: 1.0,      label: 'Ajustado',    cls: 'ref-warn' },
      { max: 1.5,      label: 'Aceptable',   cls: 'ref-neutral' },
      { max: 2.5,      label: 'Sólido',      cls: 'ref-good' },
      { max: Infinity, label: 'Muy sólido',  cls: 'ref-great' },
    ],
    note: 'Muy alto (> 4) puede indicar ineficiencia de capital. Ideal: 1.5-2.5. Varía por industria.',
  },
  quick_ratio: {
    label: 'Quick Ratio',
    desc: '(Activos corrientes − Inventario) / Pasivos corrientes. Más conservador que Current Ratio.',
    lowerIsBetter: false,
    thresholds: [
      { max: 0.5,      label: 'Riesgo',      cls: 'ref-bad' },
      { max: 1.0,      label: 'Límite',      cls: 'ref-warn' },
      { max: 1.5,      label: 'Bueno',       cls: 'ref-good' },
      { max: Infinity, label: 'Excelente',   cls: 'ref-great' },
    ],
    note: 'Excluye inventario (difícil de liquidar rápido). Para retailers con bajo inventario, Quick ≈ Current.',
  },
  interest_coverage: {
    label: 'Interest Coverage',
    desc: 'EBIT / Gastos de interés. Cuántas veces se cubren los intereses con ganancias operativas.',
    lowerIsBetter: false,
    thresholds: [
      { max: 1.5,      label: 'Peligroso',   cls: 'ref-bad' },
      { max: 3.0,      label: 'Bajo',        cls: 'ref-warn' },
      { max: 5.0,      label: 'Aceptable',   cls: 'ref-neutral' },
      { max: 10.0,     label: 'Sólido',      cls: 'ref-good' },
      { max: Infinity, label: 'Muy sólido',  cls: 'ref-great' },
    ],
    note: '< 1.5 = zona de peligro de default. Buffett busca > 5x. Sin deuda → N/D (signo muy positivo).',
  },
  revenue_growth: {
    label: 'Revenue Growth (YoY)',
    desc: 'Crecimiento de ingresos respecto al mismo período del año anterior.',
    lowerIsBetter: false,
    thresholds: [
      { max: 0,        label: 'Negativo',    cls: 'ref-bad' },
      { max: 3,        label: 'Estancado',   cls: 'ref-warn' },
      { max: 8,        label: 'Moderado',    cls: 'ref-neutral' },
      { max: 18,       label: 'Bueno',       cls: 'ref-good' },
      { max: Infinity, label: 'Alto',        cls: 'ref-great' },
    ],
    note: 'S&P 500 nominal histórico: ~5-7%. Tech top: 15-30%. Comparar vs. sector y guidance.',
  },
  earnings_growth: {
    label: 'Earnings Growth (YoY)',
    desc: 'Crecimiento de ganancias por acción respecto al año anterior.',
    lowerIsBetter: false,
    thresholds: [
      { max: 0,        label: 'Negativo',    cls: 'ref-bad' },
      { max: 5,        label: 'Lento',       cls: 'ref-warn' },
      { max: 12,       label: 'Moderado',    cls: 'ref-neutral' },
      { max: 25,       label: 'Bueno',       cls: 'ref-good' },
      { max: Infinity, label: 'Alto',        cls: 'ref-great' },
    ],
    note: 'Buffett busca EPS growth > 10% sostenido por años. Un trimestre no define el trend.',
  },
  fcf_yield: {
    label: 'FCF Yield',
    desc: 'Free Cash Flow / Market Cap. Rendimiento real del negocio para el accionista.',
    lowerIsBetter: false,
    thresholds: [
      { max: 0,        label: 'Negativo',    cls: 'ref-bad' },
      { max: 2,        label: 'Bajo',        cls: 'ref-warn' },
      { max: 4,        label: 'Razonable',   cls: 'ref-neutral' },
      { max: 7,        label: 'Atractivo',   cls: 'ref-good' },
      { max: Infinity, label: 'Muy atractivo', cls: 'ref-great' },
    ],
    note: 'FCF Yield > 5% se considera atractivo. Es la inversa del P/FCF. Más real que el P/E contable.',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════
const SETTINGS_KEY = 'ss_cfg';
const REPO_OWNER   = 'facubelini';
const REPO_NAME    = 'stock-screener';

// ═══════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════════════
const state = {
  data: null,
  byTicker: null,   // Map ticker → acción, para el render lazy del detalle
  filtered: [],
  sortDir: 'desc',
};

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════
const Settings = {
  get()        { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; } },
  save(s)      { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); },
  getToken()   { return this.get().token || ''; },
  setToken(t)  { const s = this.get(); s.token = t; this.save(s); },
  clearToken() { const s = this.get(); delete s.token; this.save(s); },
};

// ═══════════════════════════════════════════════════════════════════════
// TOOLTIP SYSTEM
// ═══════════════════════════════════════════════════════════════════════
const tipRegistry = new Map();
let tipIdCounter = 0;

function clearTipRegistry() { tipRegistry.clear(); tipIdCounter = 0; }

function registerTip(html) {
  const id = ++tipIdCounter;
  tipRegistry.set(id, html);
  return id;
}

const Tooltip = {
  el: null,
  init() {
    this.el = document.getElementById('globalTooltip');
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-tip-id]');
      if (!t) return;
      const html = tipRegistry.get(parseInt(t.dataset.tipId));
      if (!html) return;
      this.el.innerHTML = html;
      this.el.classList.add('tip-visible');
    });
    document.addEventListener('mousemove', e => {
      if (!this.el.classList.contains('tip-visible')) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = this.el.offsetWidth, h = this.el.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > vw - 8) x = e.clientX - w - 14;
      if (y + h > vh - 8) y = e.clientY - h - 14;
      this.el.style.left = x + 'px';
      this.el.style.top  = y + 'px';
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('[data-tip-id]')) this.el.classList.remove('tip-visible');
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════
// RATIO REFERENCE HELPERS
// ═══════════════════════════════════════════════════════════════════════
function getActiveThreshold(key, rawValue) {
  const ref = RATIO_REFS[key];
  if (!ref) return null;
  // Un múltiplo negativo (P/E con pérdidas, P/B con equity negativo) no debe
  // caer en "< 10 = Muy barato": tiene su propia interpretación.
  if (rawValue < 0 && ref.negative) return ref.negative;
  return ref.thresholds.find(t => rawValue <= t.max) ?? ref.thresholds.at(-1);
}

function buildTooltipHtml(key, rawValue, displayValue) {
  const ref = RATIO_REFS[key];
  if (!ref) return '';
  const active = getActiveThreshold(key, rawValue);

  let rows = '';
  if (ref.negative) {
    const isCur = active === ref.negative;
    rows += `<div class="tip-row ${ref.negative.cls}${isCur ? ' tip-active' : ''}">&lt;&nbsp;0: ${ref.negative.label}${isCur ? '&nbsp;◄' : ''}</div>`;
  }
  let prev = null;
  for (const t of ref.thresholds) {
    const isCurrent = t === active;
    const isLast = t.max === Infinity;
    let range;
    if (prev === null) {
      range = `&lt;&nbsp;${t.max}`;
    } else if (isLast) {
      range = `&gt;&nbsp;${prev}`;
    } else {
      range = `${prev}&nbsp;–&nbsp;${t.max}`;
    }
    const arrow = isCurrent ? '&nbsp;◄' : '';
    rows += `<div class="tip-row ${t.cls}${isCurrent ? ' tip-active' : ''}">${range}: ${t.label}${arrow}</div>`;
    if (!isLast) prev = t.max;
  }

  const dirLabel = ref.lowerIsBetter ? '↓ menor es mejor' : '↑ mayor es mejor';

  return `<div class="tip-title">${ref.label} <span style="font-size:.55rem;color:var(--text-muted);font-weight:400">${dirLabel}</span></div>
    <div class="tip-desc">${ref.desc}</div>
    <div class="tip-current-val">Valor: <strong>${displayValue}</strong>&nbsp;→&nbsp;<span class="${active?.cls ?? ''}">${active?.label ?? '—'}</span></div>
    <div class="tip-separator"></div>
    <div class="tip-thresholds">${rows}</div>
    ${ref.note ? `<div class="tip-note">${ref.note}</div>` : ''}`;
}

function renderRefDot(key, rawValue, displayValue) {
  if (rawValue === null || rawValue === undefined) return '';
  const active = getActiveThreshold(key, rawValue);
  if (!active) return '';
  const tipHtml = buildTooltipHtml(key, rawValue, displayValue);
  const id = registerTip(tipHtml);
  return `<span class="ref-dot ${active.cls}" data-tip-id="${id}"></span>`;
}

// ═══════════════════════════════════════════════════════════════════════
// GITHUB UPLOADER
// ═══════════════════════════════════════════════════════════════════════
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function githubFetch(path, token, opts = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

function showStatus(msg, type = 'loading') {
  const bar = document.getElementById('statusBar');
  if (!bar) return;
  bar.textContent = msg;
  bar.className = `status-bar status-${type}`;
  bar.style.display = 'block';
}

function clearStatus() {
  const bar = document.getElementById('statusBar');
  if (bar) bar.style.display = 'none';
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Normaliza un nombre de columna: minúsculas sin tildes para comparar flexible
function normCol(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Candidatos de nombre para la columna de tickers (normalizados)
const TICKER_COL_CANDIDATES = ['ticker', 'codigo', 'symbol', 'simbolo', 'accion', 'code', 'isin'];

function detectTickerKey(rows) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  return keys.find(k => TICKER_COL_CANDIDATES.includes(normCol(k))) ?? keys[0] ?? null;
}

function countTickersInFile(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets['Tickers'] ?? wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const key = detectTickerKey(rows);
        if (!key) { resolve(0); return; }
        resolve(rows.filter(r => r[key] && String(r[key]).trim().length > 0).length);
      } catch { resolve(0); }
    };
    reader.onerror = () => resolve(0);
    reader.readAsArrayBuffer(file);
  });
}

async function uploadExcel(file) {
  const token = Settings.getToken();
  if (!token) {
    showStatus('⚙  Configurá tu GitHub Token antes de subir. Hacé click en ⚙', 'error');
    document.getElementById('settingsModal').classList.remove('hidden');
    return;
  }

  try {
    showStatus('📖 Leyendo Excel...', 'loading');
    const [b64, count] = await Promise.all([fileToBase64(file), countTickersInFile(file)]);

    if (count === 0) {
      showStatus('✗ No se encontraron tickers en el Excel. Verificá que la hoja se llame "Tickers".', 'error');
      return;
    }

    showStatus(`✓ ${count} tickers detectados. Subiendo a GitHub...`, 'loading');

    // Obtener SHA del archivo actual (requerido para actualizar)
    let sha;
    const shaResp = await githubFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/tickers.xlsx`, token);
    if (shaResp.ok) {
      const cur = await shaResp.json();
      sha = cur.sha;
    }

    // Subir archivo
    const body = {
      message: `update: tickers.xlsx (${count} tickers) — subido vía web UI`,
      content: b64,
    };
    if (sha) body.sha = sha;

    const upResp = await githubFetch(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/tickers.xlsx`, token,
      { method: 'PUT', body: JSON.stringify(body) }
    );

    if (!upResp.ok) {
      const err = await upResp.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${upResp.status}`);
    }

    showStatus('✓ Archivo subido. Esperando que GitHub Actions analice los tickers...', 'loading');
    await pollWorkflow(token, count);

  } catch (err) {
    showStatus(`✗ Error: ${err.message}`, 'error');
  }
}

async function pollWorkflow(token, count) {
  // Esperar a que GitHub cree el run del workflow
  await sleep(5000);

  // Pedir runs del workflow específico (no el último run global, que puede
  // ser el cron diario u otro workflow y haría reportar un estado ajeno)
  const runsResp = await githubFetch(
    `/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/update.yml/runs?per_page=1`, token
  );
  if (!runsResp.ok) {
    showStatus('⚠ No se pudo verificar el workflow. Revisá GitHub Actions manualmente.', 'warning');
    return;
  }

  const runs = await runsResp.json();
  if (!runs.workflow_runs?.length) {
    showStatus('⚠ Workflow no encontrado. Puede demorar unos segundos más en aparecer.', 'warning');
    return;
  }

  const runId = runs.workflow_runs[0].id;
  let attempts = 0;
  const MAX = 40; // hasta ~3.5 minutos

  while (attempts < MAX) {
    await sleep(5000);
    const runResp = await githubFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}`, token);
    if (!runResp.ok) { attempts++; continue; }

    const run = await runResp.json();
    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        showStatus(`✓ Análisis completado — ${count} tickers. Actualizando dashboard...`, 'success');
        await sleep(2000);
        await cargarDatos();
        await sleep(1500);
        clearStatus();
      } else {
        showStatus(`✗ El workflow terminó con error (${run.conclusion}). Revisá GitHub Actions.`, 'error');
      }
      return;
    }

    const mins = Math.ceil(((MAX - attempts) * 5) / 60);
    showStatus(`⏳ Analizando ${count} tickers... (~${mins} min restantes)`, 'loading');
    attempts++;
  }

  showStatus('⚠ Timeout esperando el workflow. Verificá el estado en GitHub Actions.', 'warning');
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════
// Escapa HTML en strings que vienen del Excel o de yfinance (nombres,
// notas, descripciones) para que un "&" o "<" no rompa el render.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmt(val, suffix = '', decimals = 2) {
  if (val === null || val === undefined) return '<span class="text-nd">N/D</span>';
  const n = parseFloat(val);
  if (isNaN(n)) return '<span class="text-nd">N/D</span>';
  return `${n.toFixed(decimals)}${suffix}`;
}

function fmtRaw(val, decimals = 2) {
  if (val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : parseFloat(n.toFixed(decimals));
}

function fmtCurrency(val, currency = 'USD') {
  if (val === null || val === undefined) return 'N/D';
  const n = parseFloat(val);
  if (isNaN(n)) return 'N/D';
  const sym = currency === 'USD' ? '$' : '';
  return `${sym}${n.toFixed(2)}`;
}

function fmtLarge(val) {
  if (val === null || val === undefined) return 'N/D';
  const n = parseFloat(val);
  if (isNaN(n)) return 'N/D';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }) + ' UTC';
  } catch { return iso; }
}

function scoreColor(s) {
  if (s === null || s === undefined) return 'score-yellow';
  return s >= 70 ? 'score-green' : s >= 40 ? 'score-yellow' : 'score-red';
}

function senalClass(s) {
  if (!s) return 'senal-hold';
  if (s.includes('INSUFICIENTES')) return 'senal-nd';
  if (s.includes('COMPRA') && !s.includes('MODERADA')) return 'senal-buy';
  if (s.includes('MODERADA')) return 'senal-mod';
  if (s.includes('MANTENER')) return 'senal-hold';
  return 'senal-avoid';
}

function bestUpside(acc) {
  const d = acc.valuacion?.dcf?.upside_pct;
  const g = acc.valuacion?.graham?.upside_pct;
  if (d !== null && d !== undefined) return d;
  if (g !== null && g !== undefined) return g;
  return null;
}

function scoreRing(score) {
  const r = 27, circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0)) / 100;
  return { circ, dashoffset: circ * (1 - pct) };
}

// ═══════════════════════════════════════════════════════════════════════
// ANÁLISIS — GENERADOR DE PUNTOS CLAVE Y EXPLICACIÓN DEL VEREDICTO
// Genera fortalezas/debilidades en lenguaje natural a partir de los datos
// de la acción. Todo se calcula client-side para no requerir nuevo análisis.
// ═══════════════════════════════════════════════════════════════════════

function generarPuntosClave(acc) {
  const v   = acc.ratios?.valoracion   || {};
  const ren = acc.ratios?.rentabilidad || {};
  const sol = acc.ratios?.solvencia    || {};
  const cre = acc.ratios?.crecimiento  || {};
  const cf  = acc.ratios?.cashflow     || {};
  const bc  = acc.benchmark_comparison || {};
  const bm  = bc.benchmark_used        || {};
  const val = acc.valuacion            || {};

  const fortalezas  = [];
  const debilidades = [];

  // Upside promedio DCF + Graham
  const upsArr = [val.dcf?.upside_pct, val.graham?.upside_pct].filter(x => x != null);
  const avgUp  = upsArr.length ? upsArr.reduce((a, b) => a + b, 0) / upsArr.length : null;

  // ── VALORACIÓN ────────────────────────────────────────────────────────
  const pe   = fmtRaw(v.pe);
  const peBm = bm.pe ?? null;

  if (pe !== null && peBm) {
    const ratio = pe / peBm;
    if (ratio <= 0.75)
      fortalezas.push({ texto: `P/E de ${pe.toFixed(1)}x, un ${Math.round((1 - ratio) * 100)}% más barato que su sector (${peBm.toFixed(0)}x)`, cat: 'valoracion' });
    else if (ratio >= 1.5)
      debilidades.push({ texto: `P/E de ${pe.toFixed(1)}x, un ${Math.round((ratio - 1) * 100)}% más caro que su sector (${peBm.toFixed(0)}x)`, cat: 'valoracion' });
  } else if (pe !== null) {
    if (pe <= 10 && pe > 0)
      fortalezas.push({ texto: `P/E muy bajo de ${pe.toFixed(1)}x — se paga poco por cada $1 de ganancia`, cat: 'valoracion' });
    else if (pe >= 50)
      debilidades.push({ texto: `P/E muy elevado de ${pe.toFixed(0)}x — se paga mucho por cada $1 de ganancia`, cat: 'valoracion' });
  }

  if (avgUp !== null) {
    if (avgUp >= 20)
      fortalezas.push({ texto: `Potencial alcista de +${Math.round(avgUp)}% según valuación intrínseca (DCF / Graham)`, cat: 'valoracion' });
    else if (avgUp >= 8)
      fortalezas.push({ texto: `Leve upside de +${Math.round(avgUp)}% respecto al valor intrínseco`, cat: 'valoracion' });
    else if (avgUp <= -20)
      debilidades.push({ texto: `Cotiza un ${Math.round(Math.abs(avgUp))}% por encima de su valor intrínseco`, cat: 'valoracion' });
  }

  const peg = fmtRaw(v.peg);
  if (peg !== null && peg > 0) {
    if (peg < 1.0)
      fortalezas.push({ texto: `PEG de ${peg.toFixed(2)}x — el crecimiento justifica (o supera) el precio que se paga`, cat: 'valoracion' });
    else if (peg > 2.5)
      debilidades.push({ texto: `PEG de ${peg.toFixed(1)}x — el precio parece caro relativo al crecimiento esperado`, cat: 'valoracion' });
  }

  // ── CALIDAD / RENTABILIDAD ────────────────────────────────────────────
  const roe  = fmtRaw(ren.roe);
  const roic = fmtRaw(ren.roic);
  const nm   = fmtRaw(ren.net_margin);
  const gm   = fmtRaw(ren.gross_margin);
  const rg   = fmtRaw(cre.revenue_growth);
  const eg   = fmtRaw(cre.earnings_growth);
  const fcfY = fmtRaw(cf.fcf_yield);
  const nmBm = bm.net_margin != null ? bm.net_margin * 100 : null;

  if (roe !== null) {
    if (roe >= 25)
      fortalezas.push({ texto: `ROE del ${Math.round(roe)}% — por cada $100 de capital propio, genera $${Math.round(roe)} de ganancia neta (excelente, Buffett busca >15%)`, cat: 'calidad' });
    else if (roe >= 15)
      fortalezas.push({ texto: `ROE sólido del ${Math.round(roe)}% — rentabilidad sobre capital propio por encima del mínimo recomendado`, cat: 'calidad' });
    else if (roe < 0)
      debilidades.push({ texto: `ROE negativo (${roe.toFixed(1)}%) — la empresa destruye capital propio`, cat: 'calidad' });
    else if (roe < 5)
      debilidades.push({ texto: `ROE muy bajo del ${roe.toFixed(1)}% — baja eficiencia sobre el capital invertido`, cat: 'calidad' });
  }

  if (roic !== null) {
    if (roic >= 20)
      fortalezas.push({ texto: `ROIC del ${Math.round(roic)}% — ventaja competitiva fuerte: genera $${(roic / 100).toFixed(2)} por cada $1 invertido en el negocio`, cat: 'calidad' });
    else if (roic >= 12)
      fortalezas.push({ texto: `ROIC bueno del ${Math.round(roic)}% — supera el costo del capital del sector`, cat: 'calidad' });
    else if (roic < 0)
      debilidades.push({ texto: `ROIC negativo (${roic.toFixed(1)}%) — el negocio destruye valor`, cat: 'calidad' });
    else if (roic < 5)
      debilidades.push({ texto: `ROIC bajo del ${roic.toFixed(1)}% — difícil cubrir el costo del capital`, cat: 'calidad' });
  }

  if (nm !== null) {
    const thr = nmBm ? Math.max(nmBm * 1.3, 15) : 15;
    if (nm >= thr)
      fortalezas.push({ texto: `Margen neto del ${nm.toFixed(0)}%${nmBm ? ` vs sector ${nmBm.toFixed(0)}%` : ''} — alta rentabilidad por cada dólar vendido`, cat: 'calidad' });
    else if (nm < 0)
      debilidades.push({ texto: `Pérdida neta: margen del ${nm.toFixed(1)}% — por cada $100 vendidos, pierde $${Math.abs(nm).toFixed(1)}`, cat: 'calidad' });
    else if (nmBm && nm < nmBm * 0.5 && nmBm > 4)
      debilidades.push({ texto: `Margen neto del ${nm.toFixed(1)}%, por debajo del sector (${nmBm.toFixed(0)}%)`, cat: 'calidad' });
  }

  if (gm !== null && gm >= 60)
    fortalezas.push({ texto: `Margen bruto del ${Math.round(gm)}% — alto poder de pricing sobre sus costos`, cat: 'calidad' });

  if (rg !== null) {
    if (rg >= 20)
      fortalezas.push({ texto: `Fuerte crecimiento de ventas: +${Math.round(rg)}% vs el año anterior`, cat: 'calidad' });
    else if (rg >= 8)
      fortalezas.push({ texto: `Crecimiento de ventas del ${rg.toFixed(0)}% YoY`, cat: 'calidad' });
    else if (rg < -5)
      debilidades.push({ texto: `Ventas en caída: ${rg.toFixed(1)}% vs el año anterior`, cat: 'calidad' });
    else if (rg < 3 && rg >= 0)
      debilidades.push({ texto: `Crecimiento de ventas muy lento: ${rg.toFixed(1)}% YoY`, cat: 'calidad' });
  }

  if (eg !== null) {
    if (eg >= 20)
      fortalezas.push({ texto: `EPS creciendo +${Math.round(eg)}% YoY — las ganancias escalan más rápido que las ventas`, cat: 'calidad' });
    else if (eg < -15)
      debilidades.push({ texto: `EPS cayendo ${Math.round(Math.abs(eg))}% YoY — las ganancias se deterioran`, cat: 'calidad' });
  }

  if (fcfY !== null) {
    if (fcfY >= 6)
      fortalezas.push({ texto: `FCF Yield del ${fcfY.toFixed(1)}% — genera mucho efectivo libre para recompras, dividendos o reinversión`, cat: 'calidad' });
    else if (fcfY < 0)
      debilidades.push({ texto: `Free Cash Flow negativo (${fcfY.toFixed(1)}%) — consume más caja de la que genera`, cat: 'calidad' });
  }

  // ── SALUD FINANCIERA ──────────────────────────────────────────────────
  // debt_equity viene de yfinance en % (80 = 0.8x): convertir a veces
  const de   = sol.debt_equity != null ? fmtRaw(sol.debt_equity / 100) : null;
  const curR = fmtRaw(sol.current_ratio);
  const ndEb = fmtRaw(sol.net_debt_ebitda);

  if (ndEb !== null) {
    if (ndEb < 0)
      fortalezas.push({ texto: `Posición de caja neta — tiene más efectivo que deuda (señal muy positiva)`, cat: 'salud' });
    else if (ndEb >= 5)
      debilidades.push({ texto: `Deuda Neta/EBITDA de ${ndEb.toFixed(1)}x — necesitaría ~${Math.ceil(ndEb)} años de EBITDA para pagar toda la deuda`, cat: 'salud' });
    else if (ndEb >= 3.5)
      debilidades.push({ texto: `Apalancamiento elevado: ${ndEb.toFixed(1)}x Deuda Neta/EBITDA`, cat: 'salud' });
  } else if (de !== null && de >= 0) {
    if (de <= 0.2)
      fortalezas.push({ texto: `Balance muy sólido: la deuda es solo el ${Math.round(de * 100)}% del patrimonio neto`, cat: 'salud' });
    else if (de >= 3)
      debilidades.push({ texto: `Deuda muy alta: ${de.toFixed(1)}x el patrimonio neto`, cat: 'salud' });
    else if (de >= 1.5)
      debilidades.push({ texto: `Apalancamiento elevado: deuda de ${de.toFixed(1)}x el patrimonio neto`, cat: 'salud' });
  }

  if (curR !== null) {
    if (curR >= 2.5)
      fortalezas.push({ texto: `Liquidez muy sólida: Current Ratio de ${curR.toFixed(1)}x`, cat: 'salud' });
    else if (curR < 1)
      debilidades.push({ texto: `Liquidez ajustada: Current Ratio de ${curR.toFixed(1)}x — los pasivos corrientes superan los activos corrientes`, cat: 'salud' });
  }

  return { fortalezas, debilidades };
}

/**
 * Genera un resumen de 1-3 frases para mostrar en la card.
 * Toma los puntos más representativos de valoración y calidad.
 */
function generarExplicacion(acc) {
  const sc = acc.scoring || {};
  const veredicto = sc.veredicto || 'JUSTA';
  const { fortalezas, debilidades } = generarPuntosClave(acc);

  if (veredicto === 'SIN DATOS') {
    return 'Yahoo Finance no provee múltiplos de valoración para este activo (frecuente en ETFs, bonos o mercados poco cubiertos). No se puede emitir un veredicto fundamentado.';
  }

  const fVal = fortalezas.filter(p => p.cat === 'valoracion').map(p => p.texto);
  const dVal = debilidades.filter(p => p.cat === 'valoracion').map(p => p.texto);
  const fOtro = fortalezas.filter(p => p.cat !== 'valoracion').map(p => p.texto);
  const dOtro = debilidades.filter(p => p.cat !== 'valoracion').map(p => p.texto);

  const frases = [];

  // 1ª frase: SIEMPRE explica el veredicto (que es de valoración).
  // Así nunca queda una card "CARA" con solo elogios, ni una "BARATA"
  // sin decir por qué está barata.
  if (veredicto === 'BARATA') {
    frases.push(fVal[0] ?? 'Sus múltiplos cotizan con descuento frente a la mediana de su sector');
  } else if (veredicto === 'CARA') {
    frases.push(dVal[0] ?? 'Sus múltiplos cotizan con prima frente al sector y al valor intrínseco estimado');
  } else {
    frases.push(fVal[0] ?? dVal[0] ?? 'Valoración en línea con la mediana de su sector');
  }

  // 2ª-3ª frase: lo más relevante de calidad/salud (1 positivo + 1 negativo)
  if (fOtro[0]) frases.push(fOtro[0]);
  if (dOtro[0]) frases.push(dOtro[0]);

  return frases.slice(0, 3).join('. ') + '.';
}

/**
 * Renderiza la sección completa "¿Por qué este veredicto?" para el expanded.
 * Muestra: metodología del score + fortalezas + debilidades detectadas.
 */
function renderRazonamiento(acc) {
  const sc = acc.scoring || {};
  const { fortalezas, debilidades } = generarPuntosClave(acc);

  // ── Tabla de metodología ────────────────────────────────────────────
  const metItems = [
    { label: 'VALORACIÓN', peso: '40%', key: 'score_valoracion',
      desc: 'Compara P/E, EV/EBITDA, P/B vs mediana sectorial + upside DCF/Graham' },
    { label: 'CALIDAD',    peso: '40%', key: 'score_calidad',
      desc: 'ROE, ROIC, márgenes, crecimiento de ventas y EPS' },
    { label: 'SALUD',      peso: '20%', key: 'score_salud',
      desc: 'Deuda Neta/EBITDA, Deuda/Equity y liquidez corriente' },
  ];

  const metodologia = `<div class="razon-metodologia">
    ${metItems.map(m => {
      const val = sc[m.key];
      const cls = scoreColor(val);
      const disp = val != null ? Math.round(val) : '—';
      return `<div class="razon-met-item">
        <span class="razon-met-label">${m.label}</span>
        <span class="razon-met-peso">${m.peso}</span>
        <span class="razon-met-val ${cls}">${disp}/100</span>
        <span class="razon-met-desc">${m.desc}</span>
      </div>`;
    }).join('')}
  </div>`;

  // ── Lista de fortalezas ─────────────────────────────────────────────
  const fortHtml = fortalezas.length ? `<div class="razon-group">
    <div class="razon-group-title razon-title-pos">● PUNTOS POSITIVOS</div>
    ${fortalezas.map(p => `<div class="razon-item razon-positivo">✓ ${p.texto}</div>`).join('')}
  </div>` : '';

  // ── Lista de debilidades ────────────────────────────────────────────
  const debHtml = debilidades.length ? `<div class="razon-group">
    <div class="razon-group-title razon-title-neg">● PUNTOS DE ATENCIÓN</div>
    ${debilidades.map(p => `<div class="razon-item razon-negativo">✗ ${p.texto}</div>`).join('')}
  </div>` : '';

  // Fallback si no hay ningún punto detectado
  const noData = !fortalezas.length && !debilidades.length
    ? `<div style="font-size:.7rem;color:var(--text-muted);font-style:italic;padding:6px 0">
        Datos insuficientes para generar un análisis detallado de esta acción.
      </div>` : '';

  return metodologia + fortHtml + debHtml + noData;
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER: SCORE CIRCLE
// ═══════════════════════════════════════════════════════════════════════
function renderScoreCircle(score, size = 68) {
  const r = 27, { circ, dashoffset } = scoreRing(score);
  const cls = scoreColor(score);
  const disp = score !== null && score !== undefined ? Math.round(score) : '—';
  return `<div class="score-circle">
    <svg class="score-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle class="score-ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
      <circle class="score-ring-fill ${cls}" cx="${size/2}" cy="${size/2}" r="${r}"
        stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${dashoffset.toFixed(2)}"/>
    </svg>
    <div class="score-text">
      <div class="score-value ${cls}">${disp}</div>
      <div class="score-label">SCORE</div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER: SUB-SCORE BARS
// ═══════════════════════════════════════════════════════════════════════
function renderSubScores(sc) {
  if (!sc) return '';
  const items = [
    { label: 'VALOR.', key: 'score_valoracion' },
    { label: 'CALIDAD', key: 'score_calidad' },
    { label: 'SALUD',  key: 'score_salud' },
  ];
  return `<div class="card-sub-scores">${items.map(({ label, key }) => {
    const v = sc[key];
    const cls = scoreColor(v);
    const pct = v !== null && v !== undefined ? Math.round(v) : 0;
    return `<div class="sub-score-item">
      <div class="sub-score-label">${label}</div>
      <div class="sub-score-bar-wrap">
        <div class="sub-score-bar-bg">
          <div class="sub-score-bar-fill ${cls}" style="width:${pct}%;background:var(--${cls === 'score-green' ? 'score-green' : cls === 'score-yellow' ? 'score-yellow' : 'score-red'})"></div>
        </div>
        <span class="sub-score-num ${cls}">${v !== null && v !== undefined ? Math.round(v) : '—'}</span>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER: RATIO TABLE ROW (con ref dot)
// ═══════════════════════════════════════════════════════════════════════
function ratioRow(nameA, keyA, rawA, dispA, nameB, keyB, rawB, dispB) {
  const dotA = rawA !== null ? renderRefDot(keyA, rawA, dispA) : '';
  const dotB = rawB !== null ? renderRefDot(keyB, rawB, dispB) : '';
  return `<tr>
    <td class="ratio-name">${nameA}</td>
    <td class="ratio-value-cell">${dispA}${dotA}</td>
    <td class="ratio-name">${nameB}</td>
    <td class="ratio-value-cell">${dispB}${dotB}</td>
  </tr>`;
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER: CARD
// ═══════════════════════════════════════════════════════════════════════
function renderCard(acc) {
  if (acc.error && !acc.ratios?.valoracion) {
    return `<div class="stock-card has-error">
      <div class="card-header">
        <div><div class="card-ticker">${esc(acc.ticker)}</div><div class="card-name">${esc(acc.nombre) || '—'}</div></div>
        <div class="card-badges">${acc.categoria ? `<span class="badge badge-categoria">${esc(acc.categoria)}</span>` : ''}</div>
      </div>
      <div class="error-card-body">Sin datos disponibles<div class="error-msg">${esc(acc.error)}</div></div>
    </div>`;
  }

  const v  = acc.ratios?.valoracion   || {};
  const r  = acc.ratios?.rentabilidad || {};
  const s  = acc.ratios?.solvencia    || {};
  const sc = acc.scoring              || {};
  const ups = bestUpside(acc);
  const precio = acc.precio_actual;
  const cardId = `card-${acc.ticker.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const veredicto = sc.veredicto || '—';

  const upsHtml = ups !== null && ups !== undefined
    ? `<span class="upside-badge ${ups >= 0 ? 'upside-pos' : 'upside-neg'}">${ups >= 0 ? '+' : ''}${ups.toFixed(1)}% DCF</span>`
    : '';

  // Valores brutos para ref dots (D/E viene en % de yfinance: pasar a veces)
  const peR   = fmtRaw(v.pe);
  const evR   = fmtRaw(v.ev_ebitda);
  const pbR   = fmtRaw(v.pb);
  const psR   = fmtRaw(v.ps);
  const roeR  = fmtRaw(r.roe);
  const roicR = fmtRaw(r.roic);
  const nmR   = fmtRaw(r.net_margin);
  const deR   = s.debt_equity != null ? fmtRaw(s.debt_equity / 100) : null;

  return `<div class="stock-card" id="${cardId}" data-ticker="${esc(acc.ticker)}">
    <div class="card-header">
      <div>
        <div class="card-ticker">${esc(acc.ticker)}</div>
        <div class="card-name" title="${esc(acc.nombre)}">${esc(acc.nombre) || '—'}</div>
      </div>
      <div class="card-badges">
        ${acc.categoria ? `<span class="badge badge-categoria">${esc(acc.categoria)}</span>` : ''}
        ${acc.sector && acc.sector !== 'Unknown' ? `<span class="badge badge-sector">${esc(acc.sector)}</span>` : ''}
        ${acc.yf_symbol && acc.yf_symbol !== acc.ticker ? `<span class="badge badge-via" title="Datos obtenidos con este símbolo de Yahoo Finance">vía ${esc(acc.yf_symbol)}</span>` : ''}
      </div>
    </div>

    <div class="card-score-section">
      ${renderScoreCircle(sc.score_global)}
      <div class="verdicts">
        <div class="veredicto-pill veredicto-${esc(veredicto).replace(/\s+/g, '_')}">${esc(veredicto)}</div>
        <div class="senal-pill ${senalClass(sc.señal)}">${esc(sc.señal) || '—'}</div>
      </div>
    </div>
    <div class="card-explicacion">${generarExplicacion(acc)}</div>

    <div class="card-price-row">
      <span class="price-current">${precio ? fmtCurrency(precio, acc.currency) : 'N/D'}</span>
      <span class="price-currency">${esc(acc.currency) || 'USD'}</span>
      ${upsHtml}
    </div>

    <div class="card-ratios">
      <table class="ratios-table">
        ${ratioRow('P/E', 'pe', peR, fmt(peR, 'x'), 'EV/EBITDA', 'ev_ebitda', evR, fmt(evR, 'x'))}
        ${ratioRow('P/B', 'pb', pbR, fmt(pbR, 'x'), 'P/S', 'ps', psR, fmt(psR, 'x'))}
        ${ratioRow('ROE', 'roe', roeR, fmt(roeR, '%'), 'ROIC', 'roic', roicR, fmt(roicR, '%'))}
        ${ratioRow('Mg. Neto', 'net_margin', nmR, fmt(nmR, '%'), 'D/E', 'debt_equity', deR, fmt(deR, 'x'))}
      </table>
    </div>

    ${renderSubScores(sc)}

    <button class="card-expand-toggle" onclick="toggleExpand('${cardId}',event)">
      <span>VER DETALLE COMPLETO</span><span class="expand-arrow">▾</span>
    </button>
    <div class="card-expanded" id="${cardId}-expanded" data-ticker="${esc(acc.ticker)}"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER: EXPANDED SECTION
// ═══════════════════════════════════════════════════════════════════════
function renderExpanded(acc) {
  const v  = acc.ratios?.valoracion   || {};
  const r  = acc.ratios?.rentabilidad || {};
  const s  = acc.ratios?.solvencia    || {};
  const cr = acc.ratios?.crecimiento  || {};
  const cf = acc.ratios?.cashflow     || {};
  const val = acc.valuacion           || {};
  const bc  = acc.benchmark_comparison || {};
  const bm  = bc.benchmark_used       || {};

  // ── ¿Por qué este veredicto? ─────────────────────────────────────────
  const razonHtml = `<div class="expanded-section">
    <div class="expanded-title">¿POR QUÉ ESTE VEREDICTO?</div>
    ${renderRazonamiento(acc)}
  </div>`;

  const valHtml = `<div class="expanded-section">
    <div class="expanded-title">VALUACIÓN INTRÍNSECA</div>
    <div class="val-cards">
      ${renderValCard(val.dcf, 'DCF 5Y + Terminal')}
      ${renderValCard(val.graham, 'Graham Number')}
      ${val.gordon?.aplica ? renderValCard(val.gordon, 'Gordon Growth') : ''}
    </div>
  </div>`;

  function expandRatio(key, label, raw, disp) {
    const dot = raw !== null && raw !== undefined ? renderRefDot(key, raw, disp) : '';
    return `<div class="modal-ratio-item">
      <div class="modal-ratio-name">${label}</div>
      <div class="modal-ratio-value">${disp}${dot}</div>
    </div>`;
  }

  const ratiosHtml = `
    <div class="expanded-section">
      <div class="expanded-title">VALORACIÓN</div>
      <div class="modal-ratios-grid">
        ${expandRatio('pe',             'P/E',           fmtRaw(v.pe),             fmt(v.pe, 'x'))}
        ${expandRatio('forward_pe',     'Forward P/E',   fmtRaw(v.forward_pe),     fmt(v.forward_pe, 'x'))}
        ${expandRatio('peg',            'PEG',           fmtRaw(v.peg),            fmt(v.peg, 'x'))}
        ${expandRatio('pb',             'P/B',           fmtRaw(v.pb),             fmt(v.pb, 'x'))}
        ${expandRatio('ps',             'P/S',           fmtRaw(v.ps),             fmt(v.ps, 'x'))}
        ${expandRatio('ev_ebitda',      'EV/EBITDA',     fmtRaw(v.ev_ebitda),      fmt(v.ev_ebitda, 'x'))}
        ${expandRatio('dividend_yield', 'Div. Yield',    fmtRaw(v.dividend_yield), fmt(v.dividend_yield, '%'))}
        ${expandRatio('payout_ratio',   'Payout Ratio',  fmtRaw(v.payout_ratio),   fmt(v.payout_ratio, '%'))}
      </div>
    </div>
    <div class="expanded-section">
      <div class="expanded-title">RENTABILIDAD</div>
      <div class="modal-ratios-grid">
        ${expandRatio('roe',              'ROE',          fmtRaw(r.roe),              fmt(r.roe, '%'))}
        ${expandRatio('roa',              'ROA',          fmtRaw(r.roa),              fmt(r.roa, '%'))}
        ${expandRatio('roic',             'ROIC',         fmtRaw(r.roic),             fmt(r.roic, '%'))}
        ${expandRatio('gross_margin',     'Mg. Bruto',    fmtRaw(r.gross_margin),     fmt(r.gross_margin, '%'))}
        ${expandRatio('operating_margin', 'Mg. Operativo',fmtRaw(r.operating_margin), fmt(r.operating_margin, '%'))}
        ${expandRatio('net_margin',       'Mg. Neto',     fmtRaw(r.net_margin),       fmt(r.net_margin, '%'))}
      </div>
    </div>
    <div class="expanded-section">
      <div class="expanded-title">SOLVENCIA &amp; CRECIMIENTO</div>
      <div class="modal-ratios-grid">
        ${expandRatio('debt_equity',       'D/E',           s.debt_equity != null ? fmtRaw(s.debt_equity / 100) : null, s.debt_equity != null ? fmt(s.debt_equity / 100, 'x') : fmt(null))}
        ${expandRatio('net_debt_ebitda',   'ND/EBITDA',     fmtRaw(s.net_debt_ebitda),    fmt(s.net_debt_ebitda, 'x'))}
        ${expandRatio('current_ratio',     'Current Ratio', fmtRaw(s.current_ratio),      fmt(s.current_ratio, 'x'))}
        ${expandRatio('quick_ratio',       'Quick Ratio',   fmtRaw(s.quick_ratio),        fmt(s.quick_ratio, 'x'))}
        ${expandRatio('revenue_growth',    'Rev. Growth',   fmtRaw(cr.revenue_growth),    fmt(cr.revenue_growth, '%'))}
        ${expandRatio('earnings_growth',   'EPS Growth',    fmtRaw(cr.earnings_growth),   fmt(cr.earnings_growth, '%'))}
        ${expandRatio('fcf_yield',         'FCF Yield',     fmtRaw(cf.fcf_yield),         fmt(cf.fcf_yield, '%'))}
        <div class="modal-ratio-item"><div class="modal-ratio-name">Market Cap</div><div class="modal-ratio-value">${fmtLarge(acc.market_cap)}</div></div>
      </div>
    </div>`;

  const bmHtml = bc.sector && bm ? `<div class="expanded-section">
    <div class="expanded-title">VS. BENCHMARK — ${bc.sector.toUpperCase()}</div>
    <div class="benchmark-grid">
      ${benchItem('P/E sector', bm.pe, 'x')}
      ${benchItem('EV/EBITDA sector', bm.ev_ebitda, 'x')}
      ${benchItem('P/B sector', bm.pb, 'x')}
      ${benchItem('ROE sector', bm.roe ? (bm.roe * 100).toFixed(1) + '%' : null)}
      ${benchItem('ROIC sector', bm.roic ? (bm.roic * 100).toFixed(1) + '%' : null)}
      ${benchItem('D/E sector', bm.debt_equity, 'x')}
    </div>
    <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">
      ${bc.pe_vs_sector          !== undefined ? diffItem('P/E',     bc.pe_vs_sector)          : ''}
      ${bc.ev_ebitda_vs_sector   !== undefined ? diffItem('EV/EBITDA',bc.ev_ebitda_vs_sector)  : ''}
      ${bc.pb_vs_sector          !== undefined ? diffItem('P/B',     bc.pb_vs_sector)          : ''}
      ${bc.roe_vs_sector         !== undefined ? diffItem('ROE',     bc.roe_vs_sector, false)  : ''}
      ${bc.net_margin_vs_sector  !== undefined ? diffItem('Mg.Neto', bc.net_margin_vs_sector, false) : ''}
    </div>
  </div>` : '';

  const descHtml = acc.descripcion ? `<div class="expanded-section">
    <div class="expanded-title">DESCRIPCIÓN</div>
    <div style="font-size:.72rem;color:var(--text-secondary);line-height:1.6">${esc(acc.descripcion)}…</div>
  </div>` : '';

  const notasHtml = acc.notas ? `<div class="expanded-section">
    <div class="expanded-title">NOTAS</div>
    <div class="notes-text">${esc(acc.notas)}</div>
  </div>` : '';

  return razonHtml + valHtml + ratiosHtml + bmHtml + descHtml + notasHtml;
}

function renderValCard(obj, label) {
  if (!obj) return '';
  const hasData = obj.valor_intrinseco !== null && obj.valor_intrinseco !== undefined;
  const up = obj.upside_pct;
  return `<div class="val-card">
    <div class="val-card-method">${label}</div>
    ${hasData
      ? `<div class="val-card-price">$${obj.valor_intrinseco}</div>
         ${up !== null && up !== undefined
           ? `<div class="val-card-upside ${up >= 0 ? 'text-green' : 'text-red'}">${up >= 0 ? '+' : ''}${up.toFixed(1)}%</div>`
           : ''}`
      : `<div class="val-card-error">${obj.error || 'Sin datos'}</div>`}
  </div>`;
}

function benchItem(name, val, suffix = '') {
  const disp = val !== null && val !== undefined ? `${val}${suffix}` : 'N/D';
  return `<div class="bench-item"><span class="bench-name">${name}</span><span class="bench-val bench-neu">${disp}</span></div>`;
}

function diffItem(name, pct, lowerIsBetter = true) {
  const positive = pct > 0;
  const cls = Math.abs(pct) < 5 ? 'bench-neu' : (positive ? 'bench-pos' : 'bench-neg');
  return `<span class="bench-item" style="min-width:auto;gap:4px;">
    <span class="bench-name">${name}</span>
    <span class="bench-val ${cls}">${pct > 0 ? '+' : ''}${pct.toFixed(1)}%</span>
  </span>`;
}

// ═══════════════════════════════════════════════════════════════════════
// TOGGLE EXPAND
// ═══════════════════════════════════════════════════════════════════════
function toggleExpand(cardId, event) {
  event.stopPropagation();
  const card     = document.getElementById(cardId);
  const expanded = document.getElementById(`${cardId}-expanded`);
  const btn      = card?.querySelector('.card-expand-toggle');
  if (!card || !expanded) return;

  // Render lazy: con cientos de tickers, generar el detalle de TODAS las
  // cards por adelantado vuelve lento el grid. Se genera recién al abrir.
  if (!expanded.dataset.loaded) {
    const acc = state.byTicker?.get(expanded.dataset.ticker);
    if (acc) {
      expanded.innerHTML = renderExpanded(acc);
      expanded.dataset.loaded = '1';
    }
  }

  const isOpen = expanded.classList.contains('open');
  expanded.classList.toggle('open', !isOpen);
  btn?.classList.toggle('expanded', !isOpen);
}

// ═══════════════════════════════════════════════════════════════════════
// FILTRAR Y ORDENAR
// ═══════════════════════════════════════════════════════════════════════
function aplicarFiltros() {
  if (!state.data) return;

  const cat    = document.getElementById('filterCategoria').value;
  const verd   = document.getElementById('filterVeredicto').value;
  const senal  = document.getElementById('filterSenal').value;
  const sector = document.getElementById('filterSector').value;
  const search = document.getElementById('searchInput').value.toLowerCase();
  const sortBy = document.getElementById('sortBy').value;

  let result = state.data.acciones.filter(acc => {
    if (cat    && acc.categoria !== cat) return false;
    if (verd   && acc.scoring?.veredicto !== verd) return false;
    if (senal  && acc.scoring?.señal !== senal) return false;
    if (sector && acc.sector !== sector) return false;
    if (search && !`${acc.ticker} ${acc.nombre} ${acc.categoria}`.toLowerCase().includes(search)) return false;
    return true;
  });

  result.sort((a, b) => {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'score_valoracion': return ((a.scoring?.score_valoracion ?? -1) - (b.scoring?.score_valoracion ?? -1)) * dir;
      case 'score_calidad':    return ((a.scoring?.score_calidad    ?? -1) - (b.scoring?.score_calidad    ?? -1)) * dir;
      case 'ticker':           return a.ticker.localeCompare(b.ticker) * dir;
      case 'upside':           return ((bestUpside(a) ?? -999) - (bestUpside(b) ?? -999)) * dir;
      default:                 return ((a.scoring?.score_global     ?? -1) - (b.scoring?.score_global     ?? -1)) * dir;
    }
  });

  state.filtered = result;
  renderGrid();
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER GRID
// ═══════════════════════════════════════════════════════════════════════
function renderGrid() {
  clearTipRegistry();
  const grid = document.getElementById('screenerGrid');
  if (!state.filtered.length) {
    grid.innerHTML = '<div class="empty-state">No hay acciones que coincidan con los filtros seleccionados.</div>';
    return;
  }
  grid.innerHTML = state.filtered.map(renderCard).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// POBLAR FILTROS
// ═══════════════════════════════════════════════════════════════════════
function poblarFiltros(data) {
  const cats    = [...new Set(data.acciones.map(a => a.categoria).filter(Boolean))].sort();
  const sectors = [...new Set(data.acciones.map(a => a.sector).filter(s => s && s !== 'Unknown'))].sort();

  const selCat = document.getElementById('filterCategoria');
  cats.forEach(c => { const o = document.createElement('option'); o.value = o.textContent = c; selCat.appendChild(o); });

  const selSec = document.getElementById('filterSector');
  sectors.forEach(s => { const o = document.createElement('option'); o.value = o.textContent = s; selSec.appendChild(o); });
}

// ═══════════════════════════════════════════════════════════════════════
// CARGAR DATOS
// ═══════════════════════════════════════════════════════════════════════
async function cargarDatos() {
  const grid = document.getElementById('screenerGrid');

  // Reset filtros dinámicos
  ['filterCategoria', 'filterSector'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = '<option value="">Todas</option>';
  });

  try {
    const resp = await fetch('data.json?v=' + Date.now());
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data._placeholder || !data.acciones?.length) {
      grid.innerHTML = `<div class="empty-state">
        <strong>No hay datos aún.</strong><br>
        <span style="font-size:.8rem;color:var(--text-muted);">
          Subí tu <strong>tickers.xlsx</strong> con el botón de arriba para disparar el análisis.<br>
          O esperá la actualización diaria de las 06:00 UTC.
        </span>
      </div>`;
      return;
    }

    state.data = data;
    state.byTicker = new Map(data.acciones.map(a => [a.ticker, a]));

    document.getElementById('updateDate').textContent = fmtDate(data.ultima_actualizacion);
    document.getElementById('statTotal').textContent  = data.total_tickers;
    document.getElementById('statOk').textContent     = data.exitosos;
    document.getElementById('statErr').textContent    = data.con_errores?.length || 0;

    poblarFiltros(data);
    aplicarFiltros();

  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="color:var(--red);">
      <strong>Error cargando data.json</strong><br>
      <span style="font-size:.8rem;color:var(--text-muted);">${err.message}</span>
    </div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════════
function initSettings() {
  const modal      = document.getElementById('settingsModal');
  const btn        = document.getElementById('settingsBtn');
  const closeBtn   = document.getElementById('settingsClose');
  const tokenInput = document.getElementById('tokenInput');
  const saveBtn    = document.getElementById('tokenSave');
  const testBtn    = document.getElementById('tokenTest');
  const clearBtn   = document.getElementById('tokenClear');
  const toggleBtn  = document.getElementById('tokenToggle');
  const statusEl   = document.getElementById('tokenStatus');

  // Abrir/cerrar modal
  btn.addEventListener('click', () => {
    tokenInput.value = Settings.getToken();
    modal.classList.remove('hidden');
    btn.classList.add('active');
  });

  [closeBtn].forEach(el => el.addEventListener('click', () => {
    modal.classList.add('hidden');
    btn.classList.remove('active');
  }));

  modal.addEventListener('click', e => { if (e.target === modal) { modal.classList.add('hidden'); btn.classList.remove('active'); } });

  // Mostrar/ocultar token
  toggleBtn.addEventListener('click', () => {
    tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
  });

  // Guardar
  saveBtn.addEventListener('click', () => {
    const t = tokenInput.value.trim();
    if (!t) { setTokenStatus('Ingresá un token.', 'err'); return; }
    Settings.setToken(t);
    setTokenStatus('✓ Token guardado.', 'ok');
  });

  // Limpiar
  clearBtn.addEventListener('click', () => {
    Settings.clearToken();
    tokenInput.value = '';
    setTokenStatus('Token eliminado.', '');
  });

  // Probar conexión
  testBtn.addEventListener('click', async () => {
    const t = tokenInput.value.trim();
    if (!t) { setTokenStatus('Ingresá un token primero.', 'err'); return; }
    setTokenStatus('Probando...', 'loading');
    try {
      const resp = await githubFetch(`/repos/${REPO_OWNER}/${REPO_NAME}`, t);
      if (resp.ok) {
        setTokenStatus('✓ Conexión OK — podés subir archivos.', 'ok');
      } else if (resp.status === 401) {
        setTokenStatus('✗ Token inválido o expirado.', 'err');
      } else if (resp.status === 403) {
        setTokenStatus('✗ Sin permisos sobre el repo. Verificá scopes.', 'err');
      } else {
        setTokenStatus(`✗ Error ${resp.status}.`, 'err');
      }
    } catch (e) {
      setTokenStatus(`✗ ${e.message}`, 'err');
    }
  });

  function setTokenStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = `token-status${cls ? ' ' + cls : ''}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  Tooltip.init();
  initSettings();
  cargarDatos();

  // Filtros y ordenamiento
  ['filterCategoria', 'filterVeredicto', 'filterSenal', 'filterSector', 'sortBy']
    .forEach(id => document.getElementById(id)?.addEventListener('change', aplicarFiltros));

  // Búsqueda con debounce: re-renderizar cientos de cards en cada tecla traba el input
  let searchTimer;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(aplicarFiltros, 150);
  });

  // Dirección de sort
  document.getElementById('sortDir').addEventListener('click', () => {
    state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
    document.getElementById('sortDir').textContent = state.sortDir === 'asc' ? '↑' : '↓';
    aplicarFiltros();
  });

  // Upload de Excel
  const fileInput = document.getElementById('tickerFileInput');
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { uploadExcel(file); fileInput.value = ''; }
  });

  // Drag & drop sobre toda la página
  document.body.addEventListener('dragover', e => {
    e.preventDefault();
    document.body.style.outline = '2px dashed var(--blue)';
  });
  document.body.addEventListener('dragleave', () => {
    document.body.style.outline = '';
  });
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    document.body.style.outline = '';
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      uploadExcel(file);
    }
  });

  // Cerrar modal detalle
  document.getElementById('modalClose')?.addEventListener('click', () => document.getElementById('detailModal').classList.add('hidden'));
  document.getElementById('detailModal')?.addEventListener('click', e => { if (e.target.id === 'detailModal') document.getElementById('detailModal').classList.add('hidden'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.getElementById('detailModal').classList.add('hidden'); document.getElementById('settingsModal').classList.add('hidden'); document.getElementById('settingsBtn').classList.remove('active'); } });
});

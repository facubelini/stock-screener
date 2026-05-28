// app.js — Stock Screener Frontend
// Carga docs/data.json y renderiza el dashboard de análisis fundamental

'use strict';

// ─── Estado global ────────────────────────────────────────────────────────────
const state = {
  data: null,
  filtered: [],
  sortDir: 'desc',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(val, suffix = '', decimals = 2) {
  if (val === null || val === undefined) return '<span class="text-nd">N/D</span>';
  const n = parseFloat(val);
  if (isNaN(n)) return '<span class="text-nd">N/D</span>';
  return `${n.toFixed(decimals)}${suffix}`;
}

function fmtCurrency(val, currency = 'USD') {
  if (val === null || val === undefined) return 'N/D';
  const n = parseFloat(val);
  if (isNaN(n)) return 'N/D';
  return `${currency === 'USD' ? '$' : ''}${n.toFixed(2)}`;
}

function fmtLarge(val) {
  if (val === null || val === undefined) return 'N/D';
  const n = parseFloat(val);
  if (isNaN(n)) return 'N/D';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-AR', {
      timeZone: 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }) + ' UTC';
  } catch { return isoStr; }
}

function scoreColor(score) {
  if (score === null || score === undefined) return 'score-yellow';
  if (score >= 70) return 'score-green';
  if (score >= 40) return 'score-yellow';
  return 'score-red';
}

function senalClass(senal) {
  if (!senal) return 'senal-hold';
  if (senal.includes('COMPRA') && !senal.includes('MODERADA')) return 'senal-buy';
  if (senal.includes('MODERADA')) return 'senal-mod';
  if (senal.includes('MANTENER')) return 'senal-hold';
  return 'senal-avoid';
}

function upside(acc) {
  const dcf = acc.valuacion?.dcf?.upside_pct;
  const gr = acc.valuacion?.graham?.upside_pct;
  if (dcf !== null && dcf !== undefined) return dcf;
  if (gr !== null && gr !== undefined) return gr;
  return null;
}

function scoreRingPath(score) {
  const r = 27;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0)) / 100;
  const dashoffset = circ * (1 - pct);
  return { circ, dashoffset, r };
}

// ─── Render score circle ──────────────────────────────────────────────────────
function renderScoreCircle(score, size = 68) {
  const r = 27;
  const { circ, dashoffset } = scoreRingPath(score);
  const cls = scoreColor(score);
  const displayScore = score !== null && score !== undefined ? Math.round(score) : '—';

  return `
    <div class="score-circle">
      <svg class="score-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle class="score-ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" />
        <circle class="score-ring-fill ${cls}"
          cx="${size/2}" cy="${size/2}" r="${r}"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${dashoffset.toFixed(2)}" />
      </svg>
      <div class="score-text">
        <div class="score-value ${cls}">${displayScore}</div>
        <div class="score-label">SCORE</div>
      </div>
    </div>`;
}

// ─── Render sub-score bars ────────────────────────────────────────────────────
function renderSubScores(scoring) {
  if (!scoring) return '';
  const items = [
    { label: 'VALOR.', key: 'score_valoracion' },
    { label: 'CALIDAD', key: 'score_calidad' },
    { label: 'SALUD', key: 'score_salud' },
  ];

  return `<div class="card-sub-scores">
    ${items.map(({ label, key }) => {
      const val = scoring[key];
      const cls = scoreColor(val);
      const pct = val !== null && val !== undefined ? Math.round(val) : 0;
      return `
        <div class="sub-score-item">
          <div class="sub-score-label">${label}</div>
          <div class="sub-score-bar-wrap">
            <div class="sub-score-bar-bg">
              <div class="sub-score-bar-fill ${cls}" style="width:${pct}%; background:currentColor"></div>
            </div>
            <span class="sub-score-num ${cls}">${val !== null && val !== undefined ? Math.round(val) : '—'}</span>
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

// ─── Render card principal ────────────────────────────────────────────────────
function renderCard(acc) {
  if (acc.error && !acc.ratios?.valoracion) {
    return `
      <div class="stock-card has-error">
        <div class="card-header">
          <div class="card-identity">
            <div class="card-ticker">${acc.ticker}</div>
            <div class="card-name">${acc.nombre || '—'}</div>
          </div>
          <div class="card-badges">
            ${acc.categoria ? `<span class="badge badge-categoria">${acc.categoria}</span>` : ''}
          </div>
        </div>
        <div class="error-card-body">
          <div>Datos no disponibles</div>
          <div class="error-msg">${acc.error}</div>
        </div>
      </div>`;
  }

  const v = acc.ratios?.valoracion || {};
  const r = acc.ratios?.rentabilidad || {};
  const s = acc.ratios?.solvencia || {};
  const sc = acc.scoring || {};
  const ups = upside(acc);
  const precio = acc.precio_actual;

  const upsideHtml = ups !== null && ups !== undefined
    ? `<span class="upside-badge ${ups >= 0 ? 'upside-pos' : 'upside-neg'}">${ups >= 0 ? '+' : ''}${ups.toFixed(1)}% DCF</span>`
    : '';

  const cardId = `card-${acc.ticker.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `
    <div class="stock-card" id="${cardId}" data-ticker="${acc.ticker}">
      <div class="card-header">
        <div class="card-identity">
          <div class="card-ticker">${acc.ticker}</div>
          <div class="card-name" title="${acc.nombre || ''}">${acc.nombre || '—'}</div>
        </div>
        <div class="card-badges">
          ${acc.categoria ? `<span class="badge badge-categoria">${acc.categoria}</span>` : ''}
          ${acc.sector && acc.sector !== 'Unknown' ? `<span class="badge badge-sector">${acc.sector}</span>` : ''}
        </div>
      </div>

      <div class="card-score-section">
        ${renderScoreCircle(sc.score_global)}
        <div class="verdicts">
          <div class="veredicto-pill veredicto-${sc.veredicto || 'JUSTA'}">${sc.veredicto || '—'}</div>
          <div class="senal-pill ${senalClass(sc.señal)}">${sc.señal || '—'}</div>
        </div>
      </div>

      <div class="card-price-row">
        <span class="price-current">${precio ? fmtCurrency(precio, acc.currency) : 'N/D'}</span>
        <span class="price-currency">${acc.currency || 'USD'}</span>
        ${upsideHtml}
      </div>

      <div class="card-ratios">
        <table class="ratios-table">
          <tr>
            <td class="ratio-name">P/E</td>
            <td class="ratio-value">${fmt(v.pe, 'x')}</td>
            <td class="ratio-name">EV/EBITDA</td>
            <td class="ratio-value">${fmt(v.ev_ebitda, 'x')}</td>
          </tr>
          <tr>
            <td class="ratio-name">P/B</td>
            <td class="ratio-value">${fmt(v.pb, 'x')}</td>
            <td class="ratio-name">P/S</td>
            <td class="ratio-value">${fmt(v.ps, 'x')}</td>
          </tr>
          <tr>
            <td class="ratio-name">ROE</td>
            <td class="ratio-value">${fmt(r.roe, '%')}</td>
            <td class="ratio-name">ROIC</td>
            <td class="ratio-value">${fmt(r.roic, '%')}</td>
          </tr>
          <tr>
            <td class="ratio-name">Mg. Neto</td>
            <td class="ratio-value">${fmt(r.net_margin, '%')}</td>
            <td class="ratio-name">D/E</td>
            <td class="ratio-value">${fmt(s.debt_equity, 'x')}</td>
          </tr>
        </table>
      </div>

      ${renderSubScores(sc)}

      <button class="card-expand-toggle" onclick="toggleExpand('${cardId}', event)">
        <span>VER DETALLE COMPLETO</span>
        <span class="expand-arrow">▾</span>
      </button>

      <div class="card-expanded" id="${cardId}-expanded">
        ${renderExpanded(acc)}
      </div>
    </div>`;
}

// ─── Sección expandible ───────────────────────────────────────────────────────
function renderExpanded(acc) {
  const v = acc.ratios?.valoracion || {};
  const r = acc.ratios?.rentabilidad || {};
  const s = acc.ratios?.solvencia || {};
  const cr = acc.ratios?.crecimiento || {};
  const cf = acc.ratios?.cashflow || {};
  const val = acc.valuacion || {};
  const bc = acc.benchmark_comparison || {};
  const bm = bc.benchmark_used || {};

  // Valuaciones intrínsecas
  const valHtml = `
    <div class="expanded-section">
      <div class="expanded-title">VALUACIÓN INTRÍNSECA</div>
      <div class="val-cards">
        ${renderValCard(val.dcf, 'DCF 5Y')}
        ${renderValCard(val.graham, 'Graham')}
        ${val.gordon?.aplica ? renderValCard(val.gordon, 'Gordon') : ''}
      </div>
    </div>`;

  // Todos los ratios
  const ratiosHtml = `
    <div class="expanded-section">
      <div class="expanded-title">RATIOS COMPLETOS — VALORACIÓN</div>
      <div class="modal-ratios-grid">
        ${ratioItem('P/E', fmt(v.pe, 'x'))}
        ${ratioItem('Forward P/E', fmt(v.forward_pe, 'x'))}
        ${ratioItem('PEG', fmt(v.peg, 'x'))}
        ${ratioItem('P/B', fmt(v.pb, 'x'))}
        ${ratioItem('P/S', fmt(v.ps, 'x'))}
        ${ratioItem('EV/EBITDA', fmt(v.ev_ebitda, 'x'))}
        ${ratioItem('Div. Yield', fmt(v.dividend_yield, '%'))}
        ${ratioItem('Payout Ratio', fmt(v.payout_ratio, '%'))}
      </div>
    </div>
    <div class="expanded-section">
      <div class="expanded-title">RATIOS COMPLETOS — RENTABILIDAD & SOLVENCIA</div>
      <div class="modal-ratios-grid">
        ${ratioItem('ROE', fmt(r.roe, '%'))}
        ${ratioItem('ROA', fmt(r.roa, '%'))}
        ${ratioItem('ROIC', fmt(r.roic, '%'))}
        ${ratioItem('Mg. Bruto', fmt(r.gross_margin, '%'))}
        ${ratioItem('Mg. Operativo', fmt(r.operating_margin, '%'))}
        ${ratioItem('Mg. Neto', fmt(r.net_margin, '%'))}
        ${ratioItem('D/E', fmt(s.debt_equity, 'x'))}
        ${ratioItem('ND/EBITDA', fmt(s.net_debt_ebitda, 'x'))}
        ${ratioItem('Current Ratio', fmt(s.current_ratio, 'x'))}
        ${ratioItem('Quick Ratio', fmt(s.quick_ratio, 'x'))}
        ${ratioItem('Int. Coverage', fmt(s.interest_coverage, 'x'))}
        ${ratioItem('Rev. Growth', fmt(cr.revenue_growth, '%'))}
        ${ratioItem('EPS Growth', fmt(cr.earnings_growth, '%'))}
        ${ratioItem('FCF Yield', fmt(cf.fcf_yield, '%'))}
        ${ratioItem('FCF/NI', fmt(cf.fcf_ni_ratio, 'x'))}
        ${ratioItem('Market Cap', fmtLarge(acc.market_cap))}
      </div>
    </div>`;

  // Benchmark comparison
  const bmHtml = (bc.sector && bm) ? `
    <div class="expanded-section">
      <div class="expanded-title">VS. BENCHMARK — ${bc.sector.toUpperCase()}</div>
      <div class="benchmark-grid">
        ${benchItem('P/E sector', bm.pe, 'x')}
        ${benchItem('EV/EBITDA sector', bm.ev_ebitda, 'x')}
        ${benchItem('P/B sector', bm.pb, 'x')}
        ${benchItem('ROE sector', bm.roe ? (bm.roe*100).toFixed(1)+'%' : null)}
        ${benchItem('ROIC sector', bm.roic ? (bm.roic*100).toFixed(1)+'%' : null)}
        ${benchItem('D/E sector', bm.debt_equity, 'x')}
      </div>
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">
        ${bc.pe_vs_sector !== undefined ? diffItem('P/E', bc.pe_vs_sector) : ''}
        ${bc.ev_ebitda_vs_sector !== undefined ? diffItem('EV/EBITDA', bc.ev_ebitda_vs_sector) : ''}
        ${bc.pb_vs_sector !== undefined ? diffItem('P/B', bc.pb_vs_sector) : ''}
        ${bc.roe_vs_sector !== undefined ? diffItem('ROE', bc.roe_vs_sector, false) : ''}
        ${bc.net_margin_vs_sector !== undefined ? diffItem('Mg.Neto', bc.net_margin_vs_sector, false) : ''}
      </div>
    </div>` : '';

  // Descripción y notas
  const descHtml = acc.descripcion ? `
    <div class="expanded-section">
      <div class="expanded-title">DESCRIPCIÓN</div>
      <div style="font-size:0.72rem; color:var(--text-secondary); line-height:1.6;">${acc.descripcion}…</div>
    </div>` : '';

  const notasHtml = acc.notas ? `
    <div class="expanded-section">
      <div class="expanded-title">NOTAS</div>
      <div class="notes-text">${acc.notas}</div>
    </div>` : '';

  return valHtml + ratiosHtml + bmHtml + descHtml + notasHtml;
}

function renderValCard(obj, label) {
  if (!obj) return '';
  const hasData = obj.valor_intrinseco !== null && obj.valor_intrinseco !== undefined;
  const up = obj.upside_pct;

  return `
    <div class="val-card">
      <div class="val-card-method">${label}</div>
      ${hasData
        ? `<div class="val-card-price">$${obj.valor_intrinseco}</div>
           ${up !== null && up !== undefined
             ? `<div class="val-card-upside ${up >= 0 ? 'text-green' : 'text-red'}">${up >= 0 ? '+' : ''}${up.toFixed(1)}%</div>`
             : ''}`
        : `<div class="val-card-error">${obj.error || 'Sin datos'}</div>`}
    </div>`;
}

function ratioItem(name, valHtml) {
  return `
    <div class="modal-ratio-item">
      <div class="modal-ratio-name">${name}</div>
      <div class="modal-ratio-value">${valHtml}</div>
    </div>`;
}

function benchItem(name, val, suffix = '') {
  const display = val !== null && val !== undefined ? `${val}${suffix}` : 'N/D';
  return `
    <div class="bench-item">
      <span class="bench-name">${name}</span>
      <span class="bench-val bench-neu">${display}</span>
    </div>`;
}

function diffItem(name, pct, lowerIsBetter = true) {
  const positive = lowerIsBetter ? pct > 0 : pct > 0;
  const cls = Math.abs(pct) < 5 ? 'bench-neu' : (positive ? 'bench-pos' : 'bench-neg');
  const sign = pct > 0 ? '+' : '';
  return `
    <span class="bench-item" style="min-width:auto; gap:4px;">
      <span class="bench-name">${name}</span>
      <span class="bench-val ${cls}">${sign}${pct.toFixed(1)}%</span>
    </span>`;
}

// ─── Toggle expand ────────────────────────────────────────────────────────────
function toggleExpand(cardId, event) {
  event.stopPropagation();
  const card = document.getElementById(cardId);
  const expanded = document.getElementById(`${cardId}-expanded`);
  const btn = card.querySelector('.card-expand-toggle');
  if (!card || !expanded) return;
  const isOpen = expanded.classList.contains('open');
  expanded.classList.toggle('open', !isOpen);
  btn.classList.toggle('expanded', !isOpen);
}

// ─── Filtrar y ordenar ────────────────────────────────────────────────────────
function aplicarFiltros() {
  if (!state.data) return;

  const cat = document.getElementById('filterCategoria').value;
  const verd = document.getElementById('filterVeredicto').value;
  const senal = document.getElementById('filterSenal').value;
  const sector = document.getElementById('filterSector').value;
  const search = document.getElementById('searchInput').value.toLowerCase();
  const sortBy = document.getElementById('sortBy').value;

  let result = state.data.acciones.filter(acc => {
    if (cat && acc.categoria !== cat) return false;
    if (verd && acc.scoring?.veredicto !== verd) return false;
    if (senal && acc.scoring?.señal !== senal) return false;
    if (sector && acc.sector !== sector) return false;
    if (search) {
      const text = `${acc.ticker} ${acc.nombre} ${acc.categoria}`.toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });

  // Ordenar
  result.sort((a, b) => {
    let va, vb;
    switch (sortBy) {
      case 'score_global':
        va = a.scoring?.score_global ?? -1;
        vb = b.scoring?.score_global ?? -1;
        break;
      case 'score_valoracion':
        va = a.scoring?.score_valoracion ?? -1;
        vb = b.scoring?.score_valoracion ?? -1;
        break;
      case 'score_calidad':
        va = a.scoring?.score_calidad ?? -1;
        vb = b.scoring?.score_calidad ?? -1;
        break;
      case 'ticker':
        return state.sortDir === 'asc'
          ? a.ticker.localeCompare(b.ticker)
          : b.ticker.localeCompare(a.ticker);
      case 'upside':
        va = upside(a) ?? -999;
        vb = upside(b) ?? -999;
        break;
      default:
        va = a.scoring?.score_global ?? -1;
        vb = b.scoring?.score_global ?? -1;
    }
    return state.sortDir === 'asc' ? va - vb : vb - va;
  });

  state.filtered = result;
  renderGrid();
}

// ─── Render grid ──────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('screenerGrid');
  if (!state.filtered.length) {
    grid.innerHTML = '<div class="empty-state">No hay acciones que coincidan con los filtros seleccionados.</div>';
    return;
  }
  grid.innerHTML = state.filtered.map(renderCard).join('');
}

// ─── Poblar filtros ────────────────────────────────────────────────────────────
function poblarFiltros(data) {
  const categorias = [...new Set(data.acciones.map(a => a.categoria).filter(Boolean))].sort();
  const sectores = [...new Set(data.acciones.map(a => a.sector).filter(s => s && s !== 'Unknown'))].sort();

  const selCat = document.getElementById('filterCategoria');
  categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selCat.appendChild(opt);
  });

  const selSec = document.getElementById('filterSector');
  sectores.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    selSec.appendChild(opt);
  });
}

// ─── Cargar datos ─────────────────────────────────────────────────────────────
async function cargarDatos() {
  const grid = document.getElementById('screenerGrid');

  try {
    const resp = await fetch('data.json?v=' + Date.now());
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.data = data;

    // Header stats
    document.getElementById('updateDate').textContent = fmtDate(data.ultima_actualizacion);
    document.getElementById('statTotal').textContent = data.total_tickers;
    document.getElementById('statOk').textContent = data.exitosos;
    document.getElementById('statErr').textContent = data.con_errores?.length || 0;

    poblarFiltros(data);
    aplicarFiltros();

  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="color:var(--red);">
        <strong>Error cargando data.json</strong><br>
        <span style="font-size:0.8rem; color:var(--text-muted);">${err.message}</span><br><br>
        <span style="font-size:0.75rem;">El workflow de GitHub Actions debe ejecutarse primero para generar los datos.</span>
      </div>`;
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();

  ['filterCategoria', 'filterVeredicto', 'filterSenal', 'filterSector', 'sortBy']
    .forEach(id => document.getElementById(id)?.addEventListener('change', aplicarFiltros));

  document.getElementById('searchInput')?.addEventListener('input', aplicarFiltros);

  document.getElementById('sortDir').addEventListener('click', () => {
    state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
    document.getElementById('sortDir').textContent = state.sortDir === 'asc' ? '↑' : '↓';
    aplicarFiltros();
  });

  // Cerrar modal
  document.getElementById('modalClose')?.addEventListener('click', () => {
    document.getElementById('detailModal').classList.add('hidden');
  });

  document.getElementById('detailModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') {
      document.getElementById('detailModal').classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.getElementById('detailModal').classList.add('hidden');
  });
});

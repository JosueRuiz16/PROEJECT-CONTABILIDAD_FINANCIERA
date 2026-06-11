/* ============================================
   SISTECOSTOS — app.js
   Lógica completa del sistema
   ============================================ */

// ── ESTADO GLOBAL ──
const state = {
  empresa: null,
  materiales: [],
  trabajadores: [],
  cifItems: []
};

// ── LOCALSTORAGE ──
const LS_KEY = 'sistecostos_v1';

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.empresa)      state.empresa      = saved.empresa;
    if (saved.materiales)   state.materiales   = saved.materiales;
    if (saved.trabajadores) state.trabajadores = saved.trabajadores;
    if (saved.cifItems)     state.cifItems     = saved.cifItems;
  } catch (e) {
    console.warn('No se pudo leer localStorage:', e);
  }
}

function clearAllData() {
  if (!confirm('¿Seguro que quieres borrar todos los datos? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem(LS_KEY);
  state.empresa = null;
  state.materiales = [];
  state.trabajadores = [];
  state.cifItems = [];
  // Limpiar campos de empresa
  ['emp-nombre','emp-giro','emp-producto','emp-area','emp-periodo','emp-unidades','emp-problema','emp-objetivo']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderInventario();
  renderNomina();
  renderCIF();
  updateDashboard();
  toast('Datos borrados correctamente.');
}

// ── UTILIDADES ──
function fmt(n) {
  const num = parseFloat(n) || 0;
  return 'C$ ' + num.toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(n) {
  return (parseFloat(n) || 0).toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(part, total) {
  if (!total) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

function toast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'ok' ? '✓ ' : '⚠ ') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function clearInputs(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── NAVEGACIÓN ──
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tnav').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.bnav').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');

  const labels = {
    dashboard:  'Panel general',
    empresa:    'Empresa',
    inventario: 'Inventario de materiales',
    nomina:     'Nómina de producción',
    cif:        'CIF — Costos indirectos',
    reporte:    'Reporte de costo de producción',
    flujo:      'Flujo del sistema'
  };
  document.getElementById('breadcrumb').textContent = labels[name] || name;

  // Activar enlace correcto en ambas navs
  const order = ['dashboard','empresa','inventario','nomina','cif','reporte','flujo'];
  const idx = order.indexOf(name);
  const tnavItems = document.querySelectorAll('.tnav');
  const bnavItems = document.querySelectorAll('.bnav');
  if (idx >= 0) {
    if (tnavItems[idx]) tnavItems[idx].classList.add('active');
    if (bnavItems[idx]) bnavItems[idx].classList.add('active');
  }

  updateDashboard();
  window.scrollTo(0, 0);
}



// ── DASHBOARD ──
function updateDashboard() {
  const md = state.materiales.filter(m => m.tipo === 'Directo').reduce((a, m) => a + m.total, 0);
  const mi = state.materiales.filter(m => m.tipo === 'Indirecto').reduce((a, m) => a + m.total, 0);
  const mod = state.trabajadores.filter(t => t.clasif === 'MOD').reduce((a, t) => a + t.bruto, 0);
  const moi = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);
  const cifExtra = state.cifItems.reduce((a, c) => a + c.monto, 0);
  const totalCIF = mi + moi + cifExtra;
  const cTotal = md + mod + totalCIF;
  const unidades = state.empresa ? parseInt(state.empresa.unidades) || 0 : 0;
  const cUnit = unidades > 0 ? cTotal / unidades : 0;

  document.getElementById('dash-md').textContent = fmt(md);
  document.getElementById('dash-mod').textContent = fmt(mod);
  document.getElementById('dash-cif').textContent = fmt(totalCIF);
  document.getElementById('dash-total').textContent = fmt(cTotal);
  document.getElementById('dash-md-items').textContent = state.materiales.filter(m => m.tipo === 'Directo').length + ' mat. directos';
  document.getElementById('dash-mod-items').textContent = state.trabajadores.filter(t => t.clasif === 'MOD').length + ' trabajadores MOD';
  document.getElementById('dash-cif-items').textContent = state.cifItems.length + ' conceptos adicionales';
  document.getElementById('dash-unit').textContent = 'Costo unit.: ' + fmt(cUnit);

  // Alert
  const alert = document.getElementById('dash-alert');
  if (state.empresa) alert.style.display = 'none';
  else alert.style.display = 'flex';

  // Status módulos
  updateModuleStatus('status-empresa', 'status-empresa-detail',
    state.empresa != null,
    state.empresa ? state.empresa.nombre : 'Sin configurar',
    false);

  updateModuleStatus('status-inv', 'status-inv-detail',
    state.materiales.length > 0,
    state.materiales.length + ' materiales registrados',
    false);

  updateModuleStatus('status-nom', 'status-nom-detail',
    state.trabajadores.length > 0,
    state.trabajadores.length + ' trabajadores registrados',
    false);

  updateModuleStatus('status-cif', 'status-cif-detail',
    state.cifItems.length > 0 || mi > 0 || moi > 0,
    state.cifItems.length + ' conceptos adicionales' + (mi + moi > 0 ? ' + auto desde módulos' : ''),
    false);
}

function updateModuleStatus(cardId, detailId, ok, detail, partial) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const dot = card.querySelector('.status-dot');
  const badge = card.querySelector('.status-badge');
  const detailEl = document.getElementById(detailId);
  if (detailEl) detailEl.textContent = detail;
  if (ok) {
    dot.className = 'status-dot dot-ok';
    badge.className = 'status-badge badge-ok';
    badge.textContent = 'Listo';
  } else {
    dot.className = 'status-dot dot-pending';
    badge.className = 'status-badge badge-pending';
    badge.textContent = 'Pendiente';
  }
}

// ── EMPRESA ──
function guardarEmpresa() {
  const nombre   = document.getElementById('emp-nombre').value.trim();
  const giro     = document.getElementById('emp-giro').value.trim();
  const producto = document.getElementById('emp-producto').value.trim();
  const area     = document.getElementById('emp-area').value.trim();
  const periodo  = document.getElementById('emp-periodo').value.trim();
  const unidades = document.getElementById('emp-unidades').value.trim();
  const problema = document.getElementById('emp-problema').value.trim();
  const objetivo = document.getElementById('emp-objetivo').value.trim();

  if (!nombre || !producto) {
    toast('Completa al menos el nombre de la empresa y el producto.', 'warn');
    return;
  }

  state.empresa = { nombre, giro, producto, area, periodo, unidades, problema, objetivo };
  saveState();
  toast('Empresa guardada correctamente.');
  updateDashboard();

  // Prefill reporte
  if (periodo) document.getElementById('rep-periodo').value = periodo;
  if (unidades) document.getElementById('rep-unidades').value = unidades;
}

// ── INVENTARIO ──
function addMaterial() {
  const codigo    = document.getElementById('inv-codigo').value.trim();
  const nombre    = document.getElementById('inv-nombre').value.trim();
  const tipo      = document.getElementById('inv-tipo').value;
  const unidad    = document.getElementById('inv-unidad').value.trim();
  const disponible= parseFloat(document.getElementById('inv-disponible').value) || 0;
  const cantidad  = parseFloat(document.getElementById('inv-cantidad').value) || 0;
  const costoUnit = parseFloat(document.getElementById('inv-costounit').value) || 0;

  if (!nombre) { toast('El nombre del material es obligatorio.', 'warn'); return; }
  if (cantidad <= 0) { toast('La cantidad consumida debe ser mayor a cero.', 'warn'); return; }
  if (costoUnit <= 0) { toast('El costo unitario debe ser mayor a cero.', 'warn'); return; }

  const total = cantidad * costoUnit;
  state.materiales.push({ id: Date.now(), codigo, nombre, tipo, unidad, disponible, cantidad, costoUnit, total });

  clearInputs(['inv-codigo','inv-nombre','inv-unidad','inv-disponible','inv-cantidad','inv-costounit']);
  renderInventario();
  updateDashboard();
  saveState();
  toast('Material "' + nombre + '" registrado.');
}

function delMaterial(id) {
  state.materiales = state.materiales.filter(m => m.id !== id);
  renderInventario();
  updateDashboard();
  saveState();
  toast('Material eliminado.');
}

function renderInventario() {
  const wrap = document.getElementById('inv-table-wrap');
  const md = state.materiales.filter(m => m.tipo === 'Directo').reduce((a, m) => a + m.total, 0);
  const mi = state.materiales.filter(m => m.tipo === 'Indirecto').reduce((a, m) => a + m.total, 0);

  document.getElementById('inv-total-md-mini').textContent = fmt(md);
  document.getElementById('inv-total-mi-mini').textContent = fmt(mi);

  if (state.materiales.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">◫</div><div>No hay materiales registrados</div></div>';
    return;
  }

  const rows = state.materiales.map(m => `
    <tr>
      <td>${m.codigo || '—'}</td>
      <td>${m.nombre}</td>
      <td><span class="pill ${m.tipo === 'Directo' ? 'pill-blue' : 'pill-orange'}">${m.tipo}</span></td>
      <td>${fmtNum(m.disponible)} ${m.unidad}</td>
      <td>${fmtNum(m.cantidad)} ${m.unidad}</td>
      <td class="num">${fmt(m.costoUnit)}</td>
      <td class="num"><strong>${fmt(m.total)}</strong></td>
      <td><button class="btn-danger" onclick="delMaterial(${m.id})" title="Eliminar">✕</button></td>
    </tr>
  `).join('');

  const totalMD = state.materiales.filter(m => m.tipo === 'Directo').reduce((a, m) => a + m.total, 0);

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Material</th>
            <th>Tipo</th>
            <th>Disponible</th>
            <th>Consumido</th>
            <th class="num">Costo unit.</th>
            <th class="num">Costo total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="6">Total material directo consumido</td>
            <td class="num">${fmt(totalMD)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── NÓMINA ──
function addTrabajador() {
  const nombre  = document.getElementById('nom-nombre').value.trim();
  const cargo   = document.getElementById('nom-cargo').value.trim();
  const area    = document.getElementById('nom-area').value.trim();
  const horas   = parseFloat(document.getElementById('nom-horas').value) || 0;
  const salario = parseFloat(document.getElementById('nom-salario').value) || 0;
  const he      = parseFloat(document.getElementById('nom-he').value) || 0;
  const valhe   = parseFloat(document.getElementById('nom-valhe').value) || 0;
  const inss    = parseFloat(document.getElementById('nom-inss').value) || 0;
  const ir      = parseFloat(document.getElementById('nom-ir').value) || 0;
  const otras   = parseFloat(document.getElementById('nom-otras').value) || 0;
  const clasif  = document.getElementById('nom-clasif').value;

  if (!nombre) { toast('El nombre del trabajador es obligatorio.', 'warn'); return; }
  if (salario <= 0) { toast('El salario ordinario debe ser mayor a cero.', 'warn'); return; }

  const pagoHE = he * valhe;
  const bruto  = salario + pagoHE;
  const deducciones = inss + ir + otras;
  const neto   = bruto - deducciones;

  state.trabajadores.push({ id: Date.now(), nombre, cargo, area, horas, salario, he, valhe, pagoHE, bruto, inss, ir, otras, deducciones, neto, clasif });

  clearInputs(['nom-nombre','nom-cargo','nom-area','nom-horas','nom-salario','nom-he','nom-valhe','nom-inss','nom-ir','nom-otras']);
  renderNomina();
  updateDashboard();
  saveState();
  toast('Trabajador "' + nombre + '" registrado.');
}

function delTrabajador(id) {
  state.trabajadores = state.trabajadores.filter(t => t.id !== id);
  renderNomina();
  updateDashboard();
  saveState();
  toast('Trabajador eliminado.');
}

function renderNomina() {
  const wrap = document.getElementById('nom-table-wrap');
  const mod = state.trabajadores.filter(t => t.clasif === 'MOD').reduce((a, t) => a + t.bruto, 0);
  const moi = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);

  document.getElementById('nom-total-mod-mini').textContent = fmt(mod);
  document.getElementById('nom-total-moi-mini').textContent = fmt(moi);

  if (state.trabajadores.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">◉</div><div>No hay trabajadores registrados</div></div>';
    return;
  }

  const clasifPill = {
    'MOD': 'pill-green',
    'MOI': 'pill-orange',
    'Gasto administrativo': 'pill-gray',
    'Gasto de venta': 'pill-purple'
  };

  const rows = state.trabajadores.map(t => `
    <tr>
      <td>${t.nombre}</td>
      <td>${t.cargo || '—'}</td>
      <td>${t.area || '—'}</td>
      <td class="num">${fmtNum(t.horas)} h</td>
      <td class="num">${fmt(t.salario)}</td>
      <td class="num">${t.he > 0 ? fmtNum(t.he) + ' h' : '—'}</td>
      <td class="num">${t.pagoHE > 0 ? fmt(t.pagoHE) : '—'}</td>
      <td class="num"><strong>${fmt(t.bruto)}</strong></td>
      <td class="num">${t.deducciones > 0 ? fmt(t.deducciones) : '—'}</td>
      <td class="num">${fmt(t.neto)}</td>
      <td><span class="pill ${clasifPill[t.clasif] || 'pill-gray'}">${t.clasif}</span></td>
      <td><button class="btn-danger" onclick="delTrabajador(${t.id})" title="Eliminar">✕</button></td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Cargo</th>
            <th>Área</th>
            <th class="num">Horas ord.</th>
            <th class="num">Sal. ordinario</th>
            <th class="num">HE</th>
            <th class="num">Pago HE</th>
            <th class="num">Sal. bruto</th>
            <th class="num">Deducciones</th>
            <th class="num">Sal. neto</th>
            <th>Clasificación</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="7">Total mano de obra directa (MOD)</td>
            <td class="num">${fmt(mod)}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── CIF ──
function addCIF() {
  const concepto = document.getElementById('cif-concepto').value.trim();
  const tipo     = document.getElementById('cif-tipo').value;
  const comp     = document.getElementById('cif-comp').value;
  const monto    = parseFloat(document.getElementById('cif-monto').value) || 0;
  const area     = document.getElementById('cif-area').value.trim();
  const obs      = document.getElementById('cif-obs').value.trim();

  if (!concepto) { toast('El concepto CIF es obligatorio.', 'warn'); return; }
  if (monto <= 0) { toast('El monto debe ser mayor a cero.', 'warn'); return; }

  state.cifItems.push({ id: Date.now(), concepto, tipo, comp, monto, area, obs });

  clearInputs(['cif-concepto','cif-monto','cif-area','cif-obs']);
  renderCIF();
  updateDashboard();
  saveState();
  toast('CIF "' + concepto + '" registrado.');
}

function delCIF(id) {
  state.cifItems = state.cifItems.filter(c => c.id !== id);
  renderCIF();
  updateDashboard();
  saveState();
  toast('CIF eliminado.');
}

function renderCIF() {
  const wrap = document.getElementById('cif-table-wrap');
  const total = state.cifItems.reduce((a, c) => a + c.monto, 0);
  document.getElementById('cif-total-mini').textContent = fmt(total);

  if (state.cifItems.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">◈</div><div>No hay CIF adicionales registrados</div></div>';
    return;
  }

  const compPill = { 'Fijo': 'pill-gray', 'Variable': 'pill-blue', 'Mixto': 'pill-purple' };
  const tipoPill = {
    'Material indirecto': 'pill-orange',
    'Mano de obra indirecta': 'pill-green',
    'Otro CIF': 'pill-gray'
  };

  const rows = state.cifItems.map(c => `
    <tr>
      <td>${c.concepto}</td>
      <td><span class="pill ${tipoPill[c.tipo] || 'pill-gray'}">${c.tipo}</span></td>
      <td><span class="pill ${compPill[c.comp] || 'pill-gray'}">${c.comp}</span></td>
      <td class="num"><strong>${fmt(c.monto)}</strong></td>
      <td>${c.area || '—'}</td>
      <td>${c.obs || '—'}</td>
      <td><button class="btn-danger" onclick="delCIF(${c.id})" title="Eliminar">✕</button></td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Tipo de CIF</th>
            <th>Comportamiento</th>
            <th class="num">Monto</th>
            <th>Área</th>
            <th>Observación</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="3">Total CIF adicionales</td>
            <td class="num">${fmt(total)}</td>
            <td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── REPORTE ──
function generarReporte() {
  const periodo  = document.getElementById('rep-periodo').value.trim() || (state.empresa ? state.empresa.periodo : 'Período actual');
  const unidades = parseInt(document.getElementById('rep-unidades').value) || 0;

  if (unidades <= 0) { toast('Ingresa las unidades producidas.', 'warn'); return; }

  // Calcular totales
  const md  = state.materiales.filter(m => m.tipo === 'Directo').reduce((a, m) => a + m.total, 0);
  const mi  = state.materiales.filter(m => m.tipo === 'Indirecto').reduce((a, m) => a + m.total, 0);
  const mod = state.trabajadores.filter(t => t.clasif === 'MOD').reduce((a, t) => a + t.bruto, 0);
  const moi = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);
  const cifExtra = state.cifItems.reduce((a, c) => a + c.monto, 0);

  const cifMI   = mi + state.cifItems.filter(c => c.tipo === 'Material indirecto').reduce((a, c) => a + c.monto, 0);
  const cifMOI  = moi + state.cifItems.filter(c => c.tipo === 'Mano de obra indirecta').reduce((a, c) => a + c.monto, 0);
  const cifOtros = state.cifItems.filter(c => c.tipo === 'Otro CIF').reduce((a, c) => a + c.monto, 0);
  const totalCIF = mi + moi + cifExtra;
  const cTotal   = md + mod + totalCIF;
  const cUnit    = cTotal / unidades;

  const empresa = state.empresa ? state.empresa.nombre : 'Mi empresa';
  const producto = state.empresa ? state.empresa.producto : '';

  // Porcentajes
  const pctMD  = cTotal > 0 ? ((md / cTotal) * 100).toFixed(1) : 0;
  const pctMOD = cTotal > 0 ? ((mod / cTotal) * 100).toFixed(1) : 0;
  const pctCIF = cTotal > 0 ? ((totalCIF / cTotal) * 100).toFixed(1) : 0;

  // Nómina detalle para reporte
  const nomRows = state.trabajadores.length > 0 ? state.trabajadores.map(t => `
    <tr>
      <td>${t.nombre}</td>
      <td>${t.cargo || '—'}</td>
      <td class="num">${fmt(t.salario)}</td>
      <td class="num">${t.pagoHE > 0 ? fmt(t.pagoHE) : '—'}</td>
      <td class="num">${fmt(t.bruto)}</td>
      <td class="num">${t.deducciones > 0 ? fmt(t.deducciones) : '—'}</td>
      <td><span class="pill ${t.clasif === 'MOD' ? 'pill-green' : 'pill-orange'}">${t.clasif}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="empty-state" style="padding:14px;">Sin datos de nómina</td></tr>';

  // Inventario detalle
  const invRows = state.materiales.length > 0 ? state.materiales.map(m => `
    <tr>
      <td>${m.codigo || '—'}</td>
      <td>${m.nombre}</td>
      <td><span class="pill ${m.tipo === 'Directo' ? 'pill-blue' : 'pill-orange'}">${m.tipo}</span></td>
      <td>${fmtNum(m.cantidad)} ${m.unidad}</td>
      <td class="num">${fmt(m.costoUnit)}</td>
      <td class="num">${fmt(m.total)}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty-state" style="padding:14px;">Sin datos de inventario</td></tr>';

  // CIF detalle
  const cifAutoRows = [];
  if (mi > 0) cifAutoRows.push(`<div class="cif-brow"><span>Materiales indirectos (inventario)</span><span>${fmt(mi)}</span></div>`);
  if (moi > 0) cifAutoRows.push(`<div class="cif-brow"><span>Mano de obra indirecta (nómina)</span><span>${fmt(moi)}</span></div>`);
  state.cifItems.forEach(c => {
    cifAutoRows.push(`<div class="cif-brow"><span>${c.concepto} <span class="pill pill-gray" style="font-size:10px;">${c.comp}</span></span><span>${fmt(c.monto)}</span></div>`);
  });
  cifAutoRows.push(`<div class="cif-brow"><span>Total CIF</span><span>${fmt(totalCIF)}</span></div>`);

  const out = document.getElementById('reporte-output');
  out.innerHTML = `

    <!-- HEADER -->
    <div class="reporte-empresa">
      <div class="reporte-empresa-name">${empresa}</div>
      <div class="reporte-empresa-meta">${producto ? 'Producto: ' + producto + '  ·  ' : ''}Período: ${periodo}  ·  Unidades producidas: ${fmtNum(unidades)}</div>
    </div>

    <!-- KPI STRIP -->
    <div class="reporte-kpis">
      <div class="rep-kpi kpi-blue">
        <div class="rep-kpi-label">Material directo</div>
        <div class="rep-kpi-value">${fmt(md)}</div>
        <div class="rep-kpi-pct">${pctMD}% del costo total</div>
      </div>
      <div class="rep-kpi kpi-green">
        <div class="rep-kpi-label">Mano de obra directa</div>
        <div class="rep-kpi-value">${fmt(mod)}</div>
        <div class="rep-kpi-pct">${pctMOD}% del costo total</div>
      </div>
      <div class="rep-kpi kpi-orange">
        <div class="rep-kpi-label">CIF acumulado</div>
        <div class="rep-kpi-value">${fmt(totalCIF)}</div>
        <div class="rep-kpi-pct">${pctCIF}% del costo total</div>
      </div>
    </div>

    <!-- TABLA PRINCIPAL -->
    <div class="reporte-table-card">
      <div class="reporte-table-head">Resumen de elementos del costo</div>
      <div class="rep-row">
        <div class="rep-row-label">
          <div class="rep-row-icon ri-blue">◫</div>
          <div>
            <div>Material directo consumido</div>
            <div class="rep-row-meta">Origen: módulo de inventario — materiales directos</div>
          </div>
        </div>
        <div class="rep-row-value">${fmt(md)}</div>
      </div>
      <div class="rep-row">
        <div class="rep-row-label">
          <div class="rep-row-icon ri-green">◉</div>
          <div>
            <div>Mano de obra directa</div>
            <div class="rep-row-meta">Origen: módulo de nómina — trabajadores MOD</div>
          </div>
        </div>
        <div class="rep-row-value">${fmt(mod)}</div>
      </div>
      <div class="rep-row">
        <div class="rep-row-label">
          <div class="rep-row-icon ri-orange">◈</div>
          <div>
            <div>Costos indirectos de fabricación (CIF)</div>
            <div class="rep-row-meta">Mat. indirecto + MOI + Otros CIF</div>
          </div>
        </div>
        <div class="rep-row-value">${fmt(totalCIF)}</div>
      </div>
      <div class="rep-total-row">
        <div class="rep-total-label">Costo total de producción</div>
        <div class="rep-total-value">${fmt(cTotal)}</div>
      </div>
    </div>

    <!-- COSTO UNITARIO -->
    <div class="rep-unit-grid">
      <div class="rep-unit-card">
        <div class="rep-unit-label">Unidades producidas</div>
        <div class="rep-unit-value">${fmtNum(unidades)}</div>
        <div class="rep-unit-sub">${producto || 'unidades'}</div>
      </div>
      <div class="rep-unit-card">
        <div class="rep-unit-label">Costo unitario de producción</div>
        <div class="rep-unit-value">${fmt(cUnit)}</div>
        <div class="rep-unit-sub">por unidad producida</div>
      </div>
    </div>

    <!-- FORMULA -->
    <div class="rep-formula">
      MD + MOD + CIF = <strong>${fmt(md)} + ${fmt(mod)} + ${fmt(totalCIF)} = ${fmt(cTotal)}</strong>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      Costo unitario = <strong>${fmt(cTotal)} ÷ ${fmtNum(unidades)} = ${fmt(cUnit)}</strong>
    </div>

    <!-- CIF DESGLOSE -->
    <div class="cif-breakdown">
      <div class="cif-breakdown-title">Desglose del CIF acumulado</div>
      ${cifAutoRows.join('')}
    </div>

    <!-- INVENTARIO DETALLE -->
    <div class="card" style="margin-bottom:18px;">
      <div class="card-head"><span class="card-title">Detalle — Inventario de materiales</span></div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Material</th><th>Tipo</th><th>Cant. consumida</th>
              <th class="num">Costo unit.</th><th class="num">Costo total</th>
            </tr>
          </thead>
          <tbody>${invRows}</tbody>
        </table>
      </div>
    </div>

    <!-- NÓMINA DETALLE -->
    <div class="card" style="margin-bottom:18px;">
      <div class="card-head"><span class="card-title">Detalle — Nómina de producción</span></div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Trabajador</th><th>Cargo</th><th class="num">Sal. ordinario</th>
              <th class="num">Pago HE</th><th class="num">Sal. bruto</th>
              <th class="num">Deducciones</th><th>Clasificación</th>
            </tr>
          </thead>
          <tbody>${nomRows}</tbody>
        </table>
      </div>
    </div>

  `;
  toast('Reporte generado correctamente.');
}

// ── CARGAR EJEMPLO ──
function cargarEjemplo() {
  // Empresa
  state.empresa = {
    nombre: 'Muebles del Pacífico, S.A.',
    giro: 'Fabricación de muebles escolares',
    producto: 'Silla escolar',
    area: 'Taller de carpintería',
    periodo: 'Enero 2025',
    unidades: '100',
    problema: 'La empresa no cuenta con un sistema organizado para registrar los costos de producción. Los cálculos se realizan de forma manual y sin clasificación adecuada, lo que genera errores y dificulta la toma de decisiones.',
    objetivo: 'Diseñar un sistema básico que permita registrar, clasificar y calcular el costo de producción de sillas escolares, integrando los módulos de inventario, nómina y CIF.'
  };
  document.getElementById('emp-nombre').value   = state.empresa.nombre;
  document.getElementById('emp-giro').value     = state.empresa.giro;
  document.getElementById('emp-producto').value = state.empresa.producto;
  document.getElementById('emp-area').value     = state.empresa.area;
  document.getElementById('emp-periodo').value  = state.empresa.periodo;
  document.getElementById('emp-unidades').value = state.empresa.unidades;
  document.getElementById('emp-problema').value = state.empresa.problema;
  document.getElementById('emp-objetivo').value = state.empresa.objetivo;

  // Inventario
  state.materiales = [
    { id: 1, codigo: 'MD-001', nombre: 'Madera de pino', tipo: 'Directo', unidad: 'Tablas', disponible: 50, cantidad: 40, costoUnit: 250, total: 10000 },
    { id: 2, codigo: 'MI-001', nombre: 'Tornillos y pegamento', tipo: 'Indirecto', unidad: 'Lote', disponible: 2, cantidad: 1, costoUnit: 1500, total: 1500 }
  ];

  // Nómina
  state.trabajadores = [
    { id: 1, nombre: 'Juan Pérez', cargo: 'Operario', area: 'Producción', horas: 240, salario: 12000, he: 10, valhe: 100, pagoHE: 1000, bruto: 13000, inss: 780, ir: 0, otras: 130, deducciones: 910, neto: 12090, clasif: 'MOD' },
    { id: 2, nombre: 'Ana Ruiz', cargo: 'Supervisora', area: 'Producción', horas: 240, salario: 8000, he: 0, valhe: 0, pagoHE: 0, bruto: 8000, inss: 480, ir: 0, otras: 80, deducciones: 560, neto: 7440, clasif: 'MOI' }
  ];

  // CIF
  state.cifItems = [
    { id: 1, concepto: 'Energía eléctrica de planta', tipo: 'Otro CIF', comp: 'Mixto', monto: 3000, area: 'Producción', obs: 'Se utiliza para operar maquinaria' },
    { id: 2, concepto: 'Depreciación de maquinaria', tipo: 'Otro CIF', comp: 'Fijo', monto: 2500, area: 'Producción', obs: 'Depreciación lineal mensual' },
    { id: 3, concepto: 'Mantenimiento de maquinaria', tipo: 'Otro CIF', comp: 'Mixto', monto: 1000, area: 'Producción', obs: 'Mantenimiento preventivo' }
  ];

  renderInventario();
  renderNomina();
  renderCIF();
  updateDashboard();
  saveState();

  document.getElementById('rep-periodo').value = 'Enero 2025';
  document.getElementById('rep-unidades').value = '100';

  toast('Datos de Muebles del Pacífico cargados.');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Restaurar campos de empresa si hay datos guardados
  if (state.empresa) {
    const e = state.empresa;
    ['nombre','giro','producto','area','periodo','unidades','problema','objetivo'].forEach(k => {
      const el = document.getElementById('emp-' + k);
      if (el && e[k]) el.value = e[k];
    });
    if (e.periodo)  document.getElementById('rep-periodo').value  = e.periodo;
    if (e.unidades) document.getElementById('rep-unidades').value = e.unidades;
  }

  renderInventario();
  renderNomina();
  renderCIF();
  showPage('dashboard');
  updateDashboard();
});

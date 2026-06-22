/* ============================================
   SISTECOSTOS — app.js
   Lógica completa del sistema
   ============================================ */


// ── USUARIOS ──
const USERS = {
  admin:     { pass: "12345",  nombre: "Josue" },
  itzy:      { pass: "itzy1",  nombre: "Itzy" },
  alejandra: { pass: "ale1",   nombre: "Alejandra" },
  david:     { pass: "david1", nombre: "David" },
  dulce:     { pass: "dulce1", nombre: "Dulce" },
};

function doLogin() {
  const user = document.getElementById("login-user").value.trim().toLowerCase();
  const pass = document.getElementById("login-pass").value;
  const err  = document.getElementById("login-error");
  if (!USERS[user] || USERS[user].pass !== pass) {
    err.textContent = "Usuario o contraseña incorrectos.";
    document.getElementById("login-pass").value = "";
    document.getElementById("login-pass").focus();
    return;
  }
  err.textContent = "";
  const nombre = USERS[user].nombre;
  document.getElementById("brand-welcome").textContent = "Bienvenido " + nombre;
  document.getElementById("login-overlay").style.display = "none";
  document.getElementById("app-shell").style.display = "block";
  sessionStorage.setItem("sc_user", user);
  sessionStorage.setItem("sc_nombre", nombre);
}

function doLogout() {
  sessionStorage.removeItem("sc_user");
  sessionStorage.removeItem("sc_nombre");
  document.getElementById("app-shell").style.display = "none";
  document.getElementById("login-overlay").style.display = "flex";
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("login-error").textContent = "";
}

function togglePass() {
  const inp = document.getElementById("login-pass");
  inp.type = inp.type === "password" ? "text" : "password";
}

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
  document.getElementById('inv-tipo').value = 'Directo';
  document.getElementById('inv-sugerencia-tag').style.display = 'none';
  document.getElementById('inv-suggestion-note').style.display = 'none';
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
    wrap.innerHTML = '<div class="empty-state"><span class="empty-icon">◫</span>No hay materiales registrados</div>';
    return;
  }

  const rows = state.materiales.map(m => {
    const lotes    = m.pepsLotes || [];
    const pepsCalc = lotes.length > 0 ? calcPeps(lotes) : null;

    // Tabla PEPS
    const pepsRows = pepsCalc ? pepsCalc.rows.map(r => `
      <tr>
        <td>${r.fecha}</td>
        <td><span class="${r.clase}">${r.tipo}</span></td>
        <td class="num">${fmtNum(r.cant)} ${m.unidad}</td>
        <td class="num">${fmt(r.costo)}</td>
        <td class="num">${fmt(r.total)}</td>
      </tr>
    `).join('') : '';

    const pepsPanel = `
      <div class="peps-panel" id="peps-${m.id}">
        <div class="peps-panel-title">Tarjeta PEPS — ${m.nombre}</div>
        <div class="peps-form form-grid cols-3" style="margin-bottom:14px;">
          <div class="form-group"><label>Fecha</label><input type="date" id="peps-fecha-${m.id}"></div>
          <div class="form-group"><label>Tipo</label><select id="peps-tipo-${m.id}"><option value="Entrada">Entrada</option><option value="Salida">Salida</option></select></div>
          <div class="form-group"><label>Cantidad</label><input type="number" id="peps-cant-${m.id}" min="0" step="any" placeholder="0"></div>
          <div class="form-group"><label>Costo unitario (C$)</label><input type="number" id="peps-costo-${m.id}" min="0" step="any" placeholder="0"></div>
        </div>
        <button class="btn-primary" style="font-size:12px; padding:7px 14px; margin-bottom:14px;" onclick="addLotePeps(${m.id})">+ Agregar lote</button>
        ${lotes.length > 0 ? `
          <div class="peps-table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Cantidad</th><th class="num">Costo unit.</th><th class="num">Total</th></tr></thead>
              <tbody>
                ${pepsRows}
                <tr class="total-row">
                  <td colspan="2">Saldo en existencia</td>
                  <td class="num peps-saldo">${fmtNum(pepsCalc.saldoCant)} ${m.unidad}</td>
                  <td></td>
                  <td class="num peps-saldo">${fmt(pepsCalc.saldoCosto)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="peps-result">
            <span class="peps-result-label">Costo material usado (PEPS)</span>
            <span class="peps-result-value">${fmt(pepsCalc.costoUsado)}</span>
          </div>
        ` : '<div style="font-size:12px; color:var(--text3); padding:8px 0;">Agrega entradas y salidas para ver el kardex PEPS.</div>'}
      </div>
    `;

    return `
      <tr>
        <td>${m.codigo || '—'}</td>
        <td>${m.nombre}</td>
        <td><span class="pill ${m.tipo === 'Directo' ? 'pill-blue' : 'pill-orange'}">${m.tipo}</span></td>
        <td>${fmtNum(m.disponible)} ${m.unidad}</td>
        <td>${fmtNum(m.cantidad)} ${m.unidad}</td>
        <td class="num">${fmt(m.costoUnit)}</td>
        <td class="num"><strong>${fmt(m.total)}</strong></td>
        <td>
          <button class="peps-toggle" onclick="togglePeps(${m.id})">PEPS</button>
        </td>
        <td><button class="btn-danger" onclick="delMaterial(${m.id})" title="Eliminar">✕</button></td>
      </tr>
      <tr>
        <td colspan="9" style="padding:0; border-bottom: 1px solid var(--border);">
          ${pepsPanel}
        </td>
      </tr>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Código</th><th>Material</th><th>Tipo</th>
            <th>Disponible</th><th>Consumido</th>
            <th class="num">Costo unit.</th><th class="num">Costo total</th>
            <th>PEPS</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="6">Total material directo consumido</td>
            <td class="num">${fmt(md)}</td><td></td><td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── NÓMINA ──
// ── CÁLCULO AUTOMÁTICO INSS / IR (Nicaragua) ──
const INSS_LABORAL_PCT   = 0.07;   // 7% sobre ingresos brutos (Reforma INSS, vigente)
const INSS_PATRONAL_PCT  = 0.225;  // 22.5% — empresas con más de 50 trabajadores
const INSS_PATRONAL_PYME = 0.215;  // 21.5% — empresas con 50 trabajadores o menos
const INATEC_PCT         = 0.02;   // 2% sobre salario bruto
const VACACIONES_PCT     = 0.0833; // 8.33% (1 mes / 12)
const AGUINALDO_PCT      = 0.0833; // 8.33% (1 mes / 12)
const IR_EXENTO_ANUAL    = 100000; // C$100,000 exentos al año según tabla oficial (ver calcIR)
const RECARGO_HE_LEGAL   = 2.0;    // Art. 62 Código del Trabajo: 100% de recargo = pago doble, fijo por ley

function calcInss(bruto) {
  return bruto * INSS_LABORAL_PCT;
}

// Tasa patronal según tamaño de empresa (Art. reforma INSS 2024)
function getInssPatronalPct() {
  const numEmpleados = state.trabajadores.length;
  return numEmpleados > 50 ? INSS_PATRONAL_PCT : INSS_PATRONAL_PYME;
}

// Tabla progresiva de IR (renta del trabajo) sobre base imponible MENSUAL,
// según la tabla oficial de Estratos de Renta Neta Anual (Ley de Concertación
// Tributaria, Nicaragua):
//   C$0.01 – 100,000.00      → 0.00 base, 0% sobre exceso de 0
//   100,000.01 – 200,000.00  → 0.00 base, 15% sobre exceso de 100,000
//   200,000.01 – 350,000.00  → 15,000.00 base, 20% sobre exceso de 200,000
//   350,000.01 – 500,000.00  → 45,000.00 base, 25% sobre exceso de 350,000
//   500,000.01 a más         → 82,500.00 base, 30% sobre exceso de 500,000
function calcIR(brutoMensual, inssMensual) {
  const baseImponible = brutoMensual - inssMensual;
  const baseAnual = baseImponible * 12;

  let irAnual = 0;
  if (baseAnual <= 100000) {
    irAnual = 0;
  } else if (baseAnual <= 200000) {
    irAnual = 0 + (baseAnual - 100000) * 0.15;
  } else if (baseAnual <= 350000) {
    irAnual = 15000 + (baseAnual - 200000) * 0.20;
  } else if (baseAnual <= 500000) {
    irAnual = 45000 + (baseAnual - 350000) * 0.25;
  } else {
    irAnual = 82500 + (baseAnual - 500000) * 0.30;
  }
  return irAnual / 12;
}

// Tabla fija de referencia para el complemento por antigüedad ("quinquenio"),
// sobre el salario base, según años de servicio. No es una obligación legal
// nicaragüense (cada empresa define la suya), se usa como tabla de referencia
// común en convenios colectivos para automatizar el cálculo:
//   0–2 años   → 0%
//   2–5 años   → 2%
//   5–10 años  → 5%
//   10–15 años → 8%
//   15–20 años → 10%
//   +20 años   → 15%
const TABLA_ANTIGUEDAD = [
  { minAnios: 20, pct: 0.15 },
  { minAnios: 15, pct: 0.10 },
  { minAnios: 10, pct: 0.08 },
  { minAnios: 5,  pct: 0.05 },
  { minAnios: 2,  pct: 0.02 },
  { minAnios: 0,  pct: 0 }
];

function calcAniosServicio(fechaIngreso) {
  if (!fechaIngreso) return 0;
  const ingreso = new Date(fechaIngreso);
  if (isNaN(ingreso.getTime())) return 0;
  const hoy = new Date();
  let anios = hoy.getFullYear() - ingreso.getFullYear();
  const aunNoCumple = (hoy.getMonth() < ingreso.getMonth()) ||
    (hoy.getMonth() === ingreso.getMonth() && hoy.getDate() < ingreso.getDate());
  if (aunNoCumple) anios -= 1;
  return Math.max(0, anios);
}

function calcPctAntiguedad(anios) {
  for (const tramo of TABLA_ANTIGUEDAD) {
    if (anios >= tramo.minAnios) return tramo.pct;
  }
  return 0;
}

function calcAntiguedad(salario, fechaIngreso) {
  const anios = calcAniosServicio(fechaIngreso);
  const pct = calcPctAntiguedad(anios);
  return { anios, pct, monto: salario * pct };
}

// Devuelve todos los cálculos derivados de los valores actuales del formulario / trabajador.
// El recargo de horas extra es FIJO por ley (100% = doble), no editable, según Art. 62 del
// Código del Trabajo de Nicaragua: toda hora extra se paga al doble del valor de la hora ordinaria,
// sin distinción entre día normal, séptimo día o feriado.
function calcNomina({ salario, fechaIngreso, bonos, jornada, he, otras }) {
  const antig = calcAntiguedad(salario, fechaIngreso);
  const antiguedad = antig.monto;
  const valorHoraOrd = jornada > 0 ? (salario / 30) / jornada : 0;
  const pagoHE  = he * valorHoraOrd * RECARGO_HE_LEGAL;
  const bruto   = salario + antiguedad + bonos + pagoHE;
  const inss    = calcInss(bruto);
  const ir      = calcIR(bruto, inss);
  const deducciones = inss + ir + otras;
  const neto    = bruto - deducciones;

  // Cargas patronales y provisiones (sobre el salario bruto del trabajador)
  const inssPatronalPct = getInssPatronalPct();
  const inssPatronal = bruto * inssPatronalPct;
  const inatec        = bruto * INATEC_PCT;
  const vacaciones    = bruto * VACACIONES_PCT;
  const aguinaldo      = bruto * AGUINALDO_PCT;

  return {
    antiguedad, aniosServicio: antig.anios, pctAntiguedad: antig.pct,
    valorHoraOrd, pagoHE, bruto, inss, ir, deducciones, neto,
    inssPatronal, inssPatronalPct, inatec, vacaciones, aguinaldo
  };
}

function readNomFormValues() {
  return {
    salario:      parseFloat(document.getElementById('nom-salario').value) || 0,
    fechaIngreso: document.getElementById('nom-fecha-ingreso').value || '',
    bonos:        parseFloat(document.getElementById('nom-bonos').value) || 0,
    jornada:      parseFloat(document.getElementById('nom-jornada').value) || 8,
    he:           parseFloat(document.getElementById('nom-he').value) || 0,
    otras:        parseFloat(document.getElementById('nom-otras').value) || 0
  };
}

function previewDeducciones() {
  const vals = readNomFormValues();
  const c = calcNomina(vals);

  document.getElementById('nom-anios-servicio-display').textContent = c.aniosServicio + (c.aniosServicio === 1 ? ' año' : ' años');
  document.getElementById('nom-pct-antiguedad-display').textContent = (c.pctAntiguedad * 100).toFixed(0) + '%';
  document.getElementById('nom-antiguedad-display').textContent     = fmt(c.antiguedad);
  document.getElementById('nom-valhora-display').textContent   = fmt(c.valorHoraOrd);
  document.getElementById('nom-pagohe-display').textContent    = fmt(c.pagoHE);
  document.getElementById('nom-bruto-display').textContent     = fmt(c.bruto);
  document.getElementById('nom-inss-display').textContent      = fmt(c.inss);
  document.getElementById('nom-ir-display').textContent        = fmt(c.ir);
  document.getElementById('nom-deduc-total-preview').textContent = fmt(c.neto);
}

function addTrabajador() {
  const nombre  = document.getElementById('nom-nombre').value.trim();
  const cargo   = document.getElementById('nom-cargo').value.trim();
  const area    = document.getElementById('nom-area').value.trim();
  const clasif  = document.getElementById('nom-clasif').value;
  const vals    = readNomFormValues();

  if (!nombre) { toast('El nombre del trabajador es obligatorio.', 'warn'); return; }
  if (vals.salario <= 0) { toast('El salario base debe ser mayor a cero.', 'warn'); return; }

  const c = calcNomina(vals);

  state.trabajadores.push({
    id: Date.now(), nombre, cargo, area, clasif,
    salario: vals.salario, fechaIngreso: vals.fechaIngreso,
    antiguedad: c.antiguedad, aniosServicio: c.aniosServicio, pctAntiguedad: c.pctAntiguedad,
    bonos: vals.bonos, jornada: vals.jornada, he: vals.he,
    valorHoraOrd: c.valorHoraOrd, pagoHE: c.pagoHE,
    bruto: c.bruto, inss: c.inss, ir: c.ir, otras: vals.otras,
    deducciones: c.deducciones, neto: c.neto,
    inssPatronal: c.inssPatronal, inssPatronalPct: c.inssPatronalPct, inatec: c.inatec,
    vacaciones: c.vacaciones, aguinaldo: c.aguinaldo
  });

  clearInputs(['nom-nombre','nom-cargo','nom-area','nom-salario','nom-fecha-ingreso','nom-bonos','nom-he','nom-otras']);
  document.getElementById('nom-jornada').value = 8;
  document.getElementById('nom-clasif').value = 'MOD';
  document.getElementById('nom-sugerencia-tag').style.display = 'none';
  document.getElementById('nom-suggestion-note').style.display = 'none';
  document.getElementById('nom-anios-servicio-display').textContent = '0 años';
  document.getElementById('nom-pct-antiguedad-display').textContent = '0%';
  document.getElementById('nom-antiguedad-display').textContent     = 'C$ 0';
  document.getElementById('nom-valhora-display').textContent = 'C$ 0';
  document.getElementById('nom-pagohe-display').textContent  = 'C$ 0';
  document.getElementById('nom-bruto-display').textContent   = 'C$ 0';
  document.getElementById('nom-inss-display').textContent    = 'C$ 0';
  document.getElementById('nom-ir-display').textContent      = 'C$ 0';
  document.getElementById('nom-deduc-total-preview').textContent = 'C$ 0';
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

// Departamento contable según clasificación (para asiento de diario)
function deptoDe(clasif) {
  if (clasif === 'MOD' || clasif === 'MOI') return 'Producción / Costos';
  if (clasif === 'Gasto administrativo') return 'Administración';
  if (clasif === 'Gasto de venta') return 'Ventas';
  return 'Otros';
}

function renderNomina() {
  const wrap = document.getElementById('nom-table-wrap');
  const mod = state.trabajadores.filter(t => t.clasif === 'MOD').reduce((a, t) => a + t.bruto, 0);
  const moi = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);

  document.getElementById('nom-total-mod-mini').textContent = fmt(mod);
  document.getElementById('nom-total-moi-mini').textContent = fmt(moi);

  renderPatronal();
  renderAsiento();

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

  const totBruto = state.trabajadores.reduce((a, t) => a + t.bruto, 0);
  const totInss  = state.trabajadores.reduce((a, t) => a + t.inss, 0);
  const totIr    = state.trabajadores.reduce((a, t) => a + t.ir, 0);
  const totDeduc = state.trabajadores.reduce((a, t) => a + t.deducciones, 0);
  const totNeto  = state.trabajadores.reduce((a, t) => a + t.neto, 0);

  const rows = state.trabajadores.map(t => `
    <tr>
      <td>${t.nombre}</td>
      <td>${t.cargo || '—'}</td>
      <td class="num">${fmt(t.salario)}</td>
      <td class="num">
        ${t.antiguedad > 0 ? fmt(t.antiguedad) : '<span style="color:var(--text3);">C$ 0</span>'}
        <div style="font-size:9.5px; color:var(--text3); margin-top:1px;">${t.aniosServicio || 0} ${(t.aniosServicio === 1) ? 'año' : 'años'} · ${((t.pctAntiguedad || 0) * 100).toFixed(0)}%</div>
      </td>
      <td class="num">${t.pagoHE > 0 ? fmt(t.pagoHE) : '—'}</td>
      <td class="num"><strong>${fmt(t.bruto)}</strong></td>
      <td class="num">${fmt(t.inss)}</td>
      <td class="num">${fmt(t.ir)}</td>
      <td class="num">${fmt(t.deducciones)}</td>
      <td class="num"><strong>${fmt(t.neto)}</strong></td>
      <td><span class="pill ${clasifPill[t.clasif] || 'pill-gray'}">${t.clasif}</span></td>
      <td><button class="btn-danger" onclick="delTrabajador(${t.id})" title="Eliminar">✕</button></td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cargo</th>
            <th class="num">Salario base</th>
            <th class="num">Antigüedad</th>
            <th class="num">Horas extras</th>
            <th class="num">Ingresos brutos</th>
            <th class="num">INSS laboral</th>
            <th class="num">IR laboral</th>
            <th class="num">Total deducciones</th>
            <th class="num">Salario neto</th>
            <th>Clasificación</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="2">TOTALES</td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num">${fmt(totBruto)}</td>
            <td class="num">${fmt(totInss)}</td>
            <td class="num">${fmt(totIr)}</td>
            <td class="num">${fmt(totDeduc)}</td>
            <td class="num">${fmt(totNeto)}</td>
            <td></td><td></td>
          </tr>
          <tr class="total-row">
            <td colspan="5">Total mano de obra directa (MOD)</td>
            <td class="num">${fmt(mod)}</td>
            <td colspan="5"></td>
          </tr>
          <tr class="total-row">
            <td colspan="5">Total mano de obra indirecta (MOI)</td>
            <td class="num">${fmt(moi)}</td>
            <td colspan="5"></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── CUADRO RESUMEN DE OBLIGACIONES PATRONALES ──
function renderPatronal() {
  const wrap = document.getElementById('nom-patronal-wrap');
  if (!wrap) return;
  if (state.trabajadores.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><span class="empty-icon">◈</span>Registra trabajadores para calcular las cargas patronales</div>';
    return;
  }

  const totBruto      = state.trabajadores.reduce((a, t) => a + t.bruto, 0);
  const totInssPat    = state.trabajadores.reduce((a, t) => a + t.inssPatronal, 0);
  const totInatec     = state.trabajadores.reduce((a, t) => a + t.inatec, 0);
  const totVacaciones = state.trabajadores.reduce((a, t) => a + t.vacaciones, 0);
  const totAguinaldo  = state.trabajadores.reduce((a, t) => a + t.aguinaldo, 0);
  const totProvisiones = totVacaciones + totAguinaldo;
  const totCargaPatronal = totInssPat + totInatec;
  const totCostoLaboral  = totBruto + totCargaPatronal + totProvisiones;

  const tasaPatronal = getInssPatronalPct();
  const tasaLabel = (tasaPatronal * 100).toFixed(1) + '%';
  const tamanoEmpresa = state.trabajadores.length > 50 ? 'más de 50 trabajadores' : '50 trabajadores o menos';

  wrap.innerHTML = `
    <div class="info-banner" style="margin-bottom:14px;">Tasa INSS patronal aplicada: <strong>${tasaLabel}</strong> — corresponde a empresas con ${tamanoEmpresa} (${state.trabajadores.length} registrados).</div>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="num">Base de cálculo</th>
            <th class="num">% aplicado</th>
            <th class="num">Total a pagar</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>INSS Patronal</td><td class="num">${fmt(totBruto)}</td><td class="num">${tasaLabel}</td><td class="num"><strong>${fmt(totInssPat)}</strong></td></tr>
          <tr><td>INATEC</td><td class="num">${fmt(totBruto)}</td><td class="num">2%</td><td class="num"><strong>${fmt(totInatec)}</strong></td></tr>
          <tr class="total-row"><td>Total cargas patronales (INSS + INATEC)</td><td></td><td></td><td class="num"><strong>${fmt(totCargaPatronal)}</strong></td></tr>
          <tr><td>Provisión Vacaciones</td><td class="num">${fmt(totBruto)}</td><td class="num">8.33%</td><td class="num">${fmt(totVacaciones)}</td></tr>
          <tr><td>Provisión Treceavo mes (Aguinaldo)</td><td class="num">${fmt(totBruto)}</td><td class="num">8.33%</td><td class="num">${fmt(totAguinaldo)}</td></tr>
          <tr class="total-row"><td>Total provisiones / prestaciones sociales</td><td></td><td></td><td class="num"><strong>${fmt(totProvisiones)}</strong></td></tr>
          <tr class="total-row"><td colspan="3">COSTO LABORAL TOTAL (Bruto + cargas + provisiones)</td><td class="num"><strong>${fmt(totCostoLaboral)}</strong></td></tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── DISTRIBUCIÓN CONTABLE — ASIENTO DE DIARIO ──
function renderAsiento() {
  const wrap = document.getElementById('nom-asiento-wrap');
  if (!wrap) return;
  if (state.trabajadores.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><span class="empty-icon">▤</span>Registra trabajadores para generar el asiento contable</div>';
    return;
  }

  const deptos = ['Producción / Costos', 'Administración', 'Ventas'];
  const porDepto = {};
  deptos.forEach(d => porDepto[d] = { bruto: 0, inssPatronal: 0, inatec: 0, vacaciones: 0, aguinaldo: 0 });

  state.trabajadores.forEach(t => {
    const d = deptoDe(t.clasif);
    if (!porDepto[d]) porDepto[d] = { bruto: 0, inssPatronal: 0, inatec: 0, vacaciones: 0, aguinaldo: 0 };
    porDepto[d].bruto        += t.bruto;
    porDepto[d].inssPatronal += t.inssPatronal;
    porDepto[d].inatec       += t.inatec;
    porDepto[d].vacaciones   += t.vacaciones;
    porDepto[d].aguinaldo    += t.aguinaldo;
  });

  const cuentaGasto = {
    'Producción / Costos': 'Costos de producción — Mano de obra',
    'Administración': 'Gastos de administración — Sueldos y salarios',
    'Ventas': 'Gastos de venta — Sueldos y salarios',
    'Otros': 'Otros gastos de personal'
  };

  const totInss   = state.trabajadores.reduce((a, t) => a + t.inss, 0);
  const totIr     = state.trabajadores.reduce((a, t) => a + t.ir, 0);
  const totOtras  = state.trabajadores.reduce((a, t) => a + t.otras, 0);
  const totNeto   = state.trabajadores.reduce((a, t) => a + t.neto, 0);
  const totBruto  = state.trabajadores.reduce((a, t) => a + t.bruto, 0);
  const totInssPat = state.trabajadores.reduce((a, t) => a + t.inssPatronal, 0);
  const totInatec   = state.trabajadores.reduce((a, t) => a + t.inatec, 0);
  const totVac      = state.trabajadores.reduce((a, t) => a + t.vacaciones, 0);
  const totAgui     = state.trabajadores.reduce((a, t) => a + t.aguinaldo, 0);

  let rowsHtml = '';
  let totalDebe = 0, totalHaber = 0;

  // 1) Registro de salarios devengados por departamento (DEBE)
  Object.keys(porDepto).forEach(d => {
    const v = porDepto[d];
    if (v.bruto <= 0) return;
    rowsHtml += `<tr><td>${cuentaGasto[d] || d}</td><td class="num">${fmt(v.bruto)}</td><td class="num">—</td></tr>`;
    totalDebe += v.bruto;
  });
  // 1b) Cargas patronales por departamento (DEBE)
  Object.keys(porDepto).forEach(d => {
    const v = porDepto[d];
    const carga = v.inssPatronal + v.inatec;
    if (carga <= 0) return;
    rowsHtml += `<tr><td>${cuentaGasto[d] || d} — Cargas patronales (INSS 22.5% + INATEC 2%)</td><td class="num">${fmt(carga)}</td><td class="num">—</td></tr>`;
    totalDebe += carga;
  });
  // 1c) Provisiones por departamento (DEBE)
  Object.keys(porDepto).forEach(d => {
    const v = porDepto[d];
    const prov = v.vacaciones + v.aguinaldo;
    if (prov <= 0) return;
    rowsHtml += `<tr><td>${cuentaGasto[d] || d} — Provisión vacaciones y treceavo mes</td><td class="num">${fmt(prov)}</td><td class="num">—</td></tr>`;
    totalDebe += prov;
  });

  // 2) Créditos (HABER)
  const haberRows = [
    ['Salarios por pagar (neto a empleados)', totNeto],
    ['INSS por pagar (laboral 7% + patronal 22.5%)', totInss + totInssPat],
    ['IR por pagar (retención laboral)', totIr],
    ['INATEC por pagar (2%)', totInatec],
    ['Vacaciones por pagar (provisión)', totVac],
    ['Aguinaldo / Treceavo mes por pagar (provisión)', totAgui]
  ];
  if (totOtras > 0) haberRows.push(['Otras deducciones por pagar', totOtras]);

  haberRows.forEach(([cuenta, monto]) => {
    if (monto <= 0) return;
    rowsHtml += `<tr><td>${cuenta}</td><td class="num">—</td><td class="num">${fmt(monto)}</td></tr>`;
    totalHaber += monto;
  });

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr><th>Cuenta</th><th class="num">Debe</th><th class="num">Haber</th></tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row"><td>TOTALES</td><td class="num">${fmt(totalDebe)}</td><td class="num">${fmt(totalHaber)}</td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:12px;color:var(--text2);margin-top:8px;">
      El gasto/costo y las cargas patronales se distribuyen según la clasificación contable de cada trabajador:
      MOD y MOI → Producción/Costos, Gasto administrativo → Administración, Gasto de venta → Ventas.
    </p>
  `;
}


// ── CLASIFICADOR GENÉRICO POR PALABRAS CLAVE ──
// Función reutilizable: recibe un texto y un diccionario {categoria: [palabras]}
// y devuelve la categoría sugerida según el match más específico (palabra más larga).
// Es siempre una sugerencia editable, nunca una clasificación definitiva — el criterio
// contable final depende de quien usa el sistema.
function normalizarTexto(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchKeyword(texto, diccionario) {
  const textoNorm = normalizarTexto(texto.toLowerCase());
  let mejorMatch = null;
  let mejorCategoria = null;

  for (const [categoria, palabras] of Object.entries(diccionario)) {
    for (const palabra of palabras) {
      const palabraNorm = normalizarTexto(palabra);
      if (textoNorm.includes(palabraNorm)) {
        if (!mejorMatch || palabraNorm.length > mejorMatch.length) {
          mejorMatch = palabraNorm;
          mejorCategoria = categoria;
        }
      }
    }
  }
  return mejorCategoria ? { categoria: mejorCategoria, palabra: mejorMatch } : null;
}

// ── CIF ──
// Clasificador por palabras clave: sugiere comportamiento (Fijo/Variable/Mixto)
// según el concepto escrito. Es una sugerencia editable, no una clasificación
// automática infalible — la clasificación final siempre depende del criterio
// contable de quien usa el sistema.
const CIF_KEYWORDS = {
  Fijo: [
    'alquiler', 'arriendo', 'renta del local', 'depreciacion', 'depreciación',
    'amortizacion', 'amortización', 'seguro', 'salario', 'sueldo', 'supervisor',
    'supervisora', 'gerente', 'jefe de planta', 'vigilancia', 'seguridad',
    'permiso', 'licencia municipal', 'impuesto municipal', 'internet',
    'telefono fijo', 'teléfono fijo', 'software', 'licencia de software',
    'arrendamiento', 'renta de equipo', 'cuota fija'
  ],
  Variable: [
    'energia electrica', 'energía eléctrica', 'electricidad', 'combustible',
    'gasolina', 'diesel', 'diésel', 'materia prima', 'material indirecto',
    'empaque', 'embalaje', 'transporte de materiales', 'flete', 'comision',
    'comisión', 'horas extra de produccion', 'agua (produccion)',
    'insumos', 'lubricantes', 'envases', 'etiquetas', 'cajas'
  ],
  Mixto: [
    'mantenimiento', 'agua', 'telefono', 'teléfono', 'reparacion', 'reparación',
    'servicios basicos', 'servicios básicos', 'limpieza', 'combustible mixto',
    'energia (planta)', 'energía (planta)'
  ]
};

function sugerirClasifCIF() {
  const texto = document.getElementById('cif-concepto').value.trim();
  const tag  = document.getElementById('cif-sugerencia-tag');
  const note = document.getElementById('cif-suggestion-note');

  if (!texto) {
    tag.style.display = 'none';
    note.style.display = 'none';
    return;
  }

  const resultado = matchKeyword(texto, CIF_KEYWORDS);

  if (resultado) {
    document.getElementById('cif-comp').value = resultado.categoria;
    tag.style.display = 'inline';
    note.style.display = 'flex';
    note.innerHTML = `<span>💡</span> Sugerido como <strong>${resultado.categoria}</strong> por la palabra clave "${resultado.palabra}". Puedes cambiarlo si no aplica a tu caso.`;
  } else {
    tag.style.display = 'none';
    note.style.display = 'flex';
    note.innerHTML = `<span>✎</span> No se detectó una palabra clave conocida — selecciona el comportamiento manualmente según tu criterio.`;
  }
}

// ── CLASIFICADOR DE NÓMINA ──
// Sugiere MOD / MOI / Gasto administrativo / Gasto de venta según el cargo y/o área
// escritos. MOD y MOI requieren además trabajar en producción para tener sentido
// contable, así que se valida el área cuando es ambigua.
const NOMINA_KEYWORDS = {
  MOD: [
    'operario', 'operaria', 'obrero', 'obrera', 'soldador', 'soldadora',
    'carpintero', 'carpintera', 'ensamblador', 'ensambladora', 'costurera',
    'costurero', 'tejedor', 'tejedora', 'cortador', 'cortadora', 'pintor de produccion',
    'maquinista', 'tornero', 'tornera', 'montador', 'montadora', 'empacador',
    'empacadora', 'tapicero', 'tapicera'
  ],
  MOI: [
    'supervisor', 'supervisora', 'jefe de produccion', 'jefe de planta',
    'encargado de bodega', 'encargada de bodega', 'bodeguero', 'bodeguera',
    'control de calidad', 'inspector de calidad', 'inspectora de calidad',
    'mantenimiento', 'tecnico de mantenimiento', 'técnico de mantenimiento',
    'vigilante de planta', 'limpieza de planta'
  ],
  'Gasto administrativo': [
    'contador', 'contadora', 'gerente general', 'recepcionista', 'secretaria',
    'secretario', 'auxiliar administrativo', 'auxiliar administrativa',
    'recursos humanos', 'asistente administrativo', 'asistente administrativa',
    'gerente administrativo', 'conserje', 'guardia de oficina', 'mensajero',
    'mensajera'
  ],
  'Gasto de venta': [
    'vendedor', 'vendedora', 'cajero', 'cajera', 'promotor', 'promotora',
    'asesor de ventas', 'asesora de ventas', 'gerente de ventas', 'comercial',
    'representante de ventas', 'impulsador', 'impulsadora', 'community manager',
    'marketing'
  ]
};

function sugerirClasifNomina() {
  const cargo = document.getElementById('nom-cargo').value.trim();
  const area  = document.getElementById('nom-area').value.trim();
  const tag   = document.getElementById('nom-sugerencia-tag');
  const note  = document.getElementById('nom-suggestion-note');

  const texto = (cargo + ' ' + area).trim();
  if (!texto) {
    tag.style.display = 'none';
    note.style.display = 'none';
    return;
  }

  const resultado = matchKeyword(texto, NOMINA_KEYWORDS);

  if (resultado) {
    document.getElementById('nom-clasif').value = resultado.categoria;
    previewDeducciones();
    tag.style.display = 'inline';
    note.style.display = 'flex';
    const etiquetas = { MOD: 'Mano de obra directa', MOI: 'Mano de obra indirecta', 'Gasto administrativo': 'Gasto administrativo', 'Gasto de venta': 'Gasto de venta' };
    note.innerHTML = `<span>💡</span> Sugerido como <strong>${etiquetas[resultado.categoria]}</strong> por "${resultado.palabra}" en el cargo/área. Puedes cambiarlo si no aplica a tu caso.`;
  } else {
    tag.style.display = 'none';
    note.style.display = 'flex';
    note.innerHTML = `<span>✎</span> No se detectó un cargo conocido — selecciona la clasificación manualmente según el rol del trabajador.`;
  }
}

// ── CLASIFICADOR DE INVENTARIO ──
// Sugiere si un material es Directo (forma parte física del producto) o
// Indirecto (necesario para producir pero no identificable en cada unidad).
const INVENTARIO_KEYWORDS = {
  Directo: [
    'madera', 'tela', 'cuero', 'metal', 'acero', 'aluminio', 'hierro',
    'plastico', 'plástico', 'harina', 'azucar', 'azúcar', 'tela de algodon',
    'tela de algodón', 'hilo', 'tabla', 'lamina', 'lámina', 'vidrio',
    'cemento', 'arena', 'piedra', 'cuero sintetico', 'cuero sintético',
    'resina', 'tornillo estructural', 'materia prima principal'
  ],
  Indirecto: [
    'tornillo', 'pegamento', 'clavo', 'clavos', 'lija', 'pintura', 'barniz',
    'cinta adhesiva', 'grasa', 'lubricante', 'aceite', 'guantes',
    'mascarilla', 'detergente', 'desinfectante', 'estopa', 'trapo',
    'broca', 'lubricante industrial', 'cinta metrica', 'cinta métrica',
    'repuesto', 'repuestos', 'filtro', 'empaque (insumo menor)'
  ]
};

function sugerirClasifInventario() {
  const texto = document.getElementById('inv-nombre').value.trim();
  const tag  = document.getElementById('inv-sugerencia-tag');
  const note = document.getElementById('inv-suggestion-note');

  if (!texto) {
    tag.style.display = 'none';
    note.style.display = 'none';
    return;
  }

  const resultado = matchKeyword(texto, INVENTARIO_KEYWORDS);

  if (resultado) {
    document.getElementById('inv-tipo').value = resultado.categoria;
    tag.style.display = 'inline';
    note.style.display = 'flex';
    note.innerHTML = `<span>💡</span> Sugerido como <strong>Material ${resultado.categoria.toLowerCase()}</strong> por "${resultado.palabra}". Puedes cambiarlo si no aplica a tu caso.`;
  } else {
    tag.style.display = 'none';
    note.style.display = 'flex';
    note.innerHTML = `<span>✎</span> No se detectó una palabra clave conocida — selecciona el tipo manualmente según si el material forma parte física del producto (directo) o no (indirecto).`;
  }
}

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
  document.getElementById('cif-sugerencia-tag').style.display = 'none';
  document.getElementById('cif-suggestion-note').style.display = 'none';
  document.getElementById('cif-comp').value = 'Fijo';
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
    { id: 1, nombre: 'Juan Pérez', cargo: 'Operario', area: 'Producción', clasif: 'MOD',
      salario: 12000, fechaIngreso: '2024-06-01', antiguedad: 0, aniosServicio: 1, pctAntiguedad: 0, bonos: 0, jornada: 8, he: 10,
      valorHoraOrd: 50, pagoHE: 1000, bruto: 13000, inss: 910, ir: 563.5, otras: 130,
      deducciones: 1603.5, neto: 11396.5,
      inssPatronal: 2795, inssPatronalPct: 0.215, inatec: 260, vacaciones: 1082.9, aguinaldo: 1082.9 },
    { id: 2, nombre: 'Ana Ruiz', cargo: 'Supervisora', area: 'Producción', clasif: 'MOI',
      salario: 8000, fechaIngreso: '2024-06-01', antiguedad: 0, aniosServicio: 1, pctAntiguedad: 0, bonos: 0, jornada: 8, he: 0,
      valorHoraOrd: 33.33, pagoHE: 0, bruto: 8000, inss: 560, ir: 0, otras: 80,
      deducciones: 640, neto: 7360,
      inssPatronal: 1720, inssPatronalPct: 0.215, inatec: 160, vacaciones: 666.4, aguinaldo: 666.4 },
    { id: 3, nombre: 'Carlos Mendoza', cargo: 'Contador', area: 'Administración', clasif: 'Gasto administrativo',
      salario: 10000, fechaIngreso: '2020-06-01', antiguedad: 500, aniosServicio: 6, pctAntiguedad: 0.05, bonos: 0, jornada: 8, he: 0,
      valorHoraOrd: 41.67, pagoHE: 0, bruto: 10500, inss: 735, ir: 214.75, otras: 100,
      deducciones: 1049.75, neto: 9450.25,
      inssPatronal: 2257.5, inssPatronalPct: 0.215, inatec: 210, vacaciones: 874.65, aguinaldo: 874.65 },
    { id: 4, nombre: 'María González', cargo: 'Vendedora', area: 'Ventas', clasif: 'Gasto de venta',
      salario: 9000, fechaIngreso: '2014-06-01', antiguedad: 720, aniosServicio: 12, pctAntiguedad: 0.08, bonos: 0, jornada: 8, he: 0,
      valorHoraOrd: 37.5, pagoHE: 0, bruto: 9720, inss: 680.4, ir: 105.94, otras: 90,
      deducciones: 876.34, neto: 8843.66,
      inssPatronal: 2089.8, inssPatronalPct: 0.215, inatec: 194.4, vacaciones: 809.68, aguinaldo: 809.68 },
    { id: 5, nombre: 'Pedro López', cargo: 'Auxiliar administrativo', area: 'Administración', clasif: 'Gasto administrativo',
      salario: 7000, fechaIngreso: '2004-06-01', antiguedad: 1050, aniosServicio: 22, pctAntiguedad: 0.15, bonos: 0, jornada: 8, he: 0,
      valorHoraOrd: 29.17, pagoHE: 0, bruto: 8050, inss: 563.5, ir: 0, otras: 70,
      deducciones: 633.5, neto: 7416.5,
      inssPatronal: 1730.75, inssPatronalPct: 0.215, inatec: 161, vacaciones: 670.56, aguinaldo: 670.56 }
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
document.addEventListener("DOMContentLoaded", () => {
  // Verificar sesión activa
  const savedUser   = sessionStorage.getItem("sc_user");
  const savedNombre = sessionStorage.getItem("sc_nombre");
  if (savedUser && USERS[savedUser]) {
    document.getElementById("brand-welcome").textContent = "Bienvenido " + savedNombre;
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("app-shell").style.display = "block";
  } else {
    document.getElementById("login-user").focus();
  }

  loadState();

  if (state.empresa) {
    const e = state.empresa;
    ["nombre","giro","producto","area","periodo","unidades","problema","objetivo"].forEach(k => {
      const el = document.getElementById("emp-" + k);
      if (el && e[k]) el.value = e[k];
    });
    if (e.periodo)  document.getElementById("rep-periodo").value  = e.periodo;
    if (e.unidades) document.getElementById("rep-unidades").value = e.unidades;
  }

  renderInventario();
  renderNomina();
  renderCIF();
  showPage("dashboard");
  updateDashboard();
});

// ── PEPS ──
function togglePeps(id) {
  const panel = document.getElementById('peps-' + id);
  if (!panel) return;
  panel.classList.toggle('open');
}

function addLotePeps(matId) {
  const fecha   = document.getElementById('peps-fecha-' + matId).value.trim();
  const tipo    = document.getElementById('peps-tipo-' + matId).value;
  const cant    = parseFloat(document.getElementById('peps-cant-' + matId).value) || 0;
  const costo   = parseFloat(document.getElementById('peps-costo-' + matId).value) || 0;

  if (!fecha || cant <= 0) { toast('Completa fecha y cantidad.', 'warn'); return; }

  const mat = state.materiales.find(m => m.id === matId);
  if (!mat) return;
  if (!mat.pepsLotes) mat.pepsLotes = [];
  mat.pepsLotes.push({ id: Date.now(), fecha, tipo, cant, costo });

  document.getElementById('peps-fecha-' + matId).value = '';
  document.getElementById('peps-cant-' + matId).value  = '';
  document.getElementById('peps-costo-' + matId).value = '';

  saveState();
  renderInventario();
  // reopen panel
  setTimeout(() => {
    const p = document.getElementById('peps-' + matId);
    if (p) p.classList.add('open');
  }, 10);
  toast('Lote PEPS registrado.');
}

function delLotePeps(matId, loteId) {
  const mat = state.materiales.find(m => m.id === matId);
  if (!mat || !mat.pepsLotes) return;
  mat.pepsLotes = mat.pepsLotes.filter(l => l.id !== loteId);
  saveState();
  renderInventario();
  setTimeout(() => {
    const p = document.getElementById('peps-' + matId);
    if (p) p.classList.add('open');
  }, 10);
}

function calcPeps(lotes) {
  // Calcula tabla kardex PEPS: entradas primero salen primero
  // Retorna { rows, costoUsado, saldoCant, saldoCosto }
  const entradas = lotes.filter(l => l.tipo === 'Entrada').sort((a,b) => a.fecha.localeCompare(b.fecha));
  const salidas  = lotes.filter(l => l.tipo === 'Salida').sort((a,b) => a.fecha.localeCompare(b.fecha));

  // Cola PEPS
  let cola = entradas.map(e => ({ fecha: e.fecha, cant: e.cant, costo: e.costo, restante: e.cant }));
  let rows = [];
  let costoUsado = 0;

  // Registrar entradas
  entradas.forEach(e => {
    rows.push({ fecha: e.fecha, tipo: 'Entrada', cant: e.cant, costo: e.costo, total: e.cant * e.costo, clase: 'peps-lote-entrada' });
  });

  // Procesar salidas PEPS
  salidas.forEach(s => {
    let restaSalida = s.cant;
    let costoSalida = 0;
    for (let lote of cola) {
      if (restaSalida <= 0) break;
      const usar = Math.min(lote.restante, restaSalida);
      costoSalida += usar * lote.costo;
      costoUsado  += usar * lote.costo;
      lote.restante -= usar;
      restaSalida   -= usar;
    }
    cola = cola.filter(l => l.restante > 0);
    rows.push({ fecha: s.fecha, tipo: 'Salida', cant: s.cant, costo: costoSalida / s.cant, total: costoSalida, clase: 'peps-lote-salida' });
  });

  // Saldo
  const saldoCant  = cola.reduce((a, l) => a + l.restante, 0);
  const saldoCosto = cola.reduce((a, l) => a + l.restante * l.costo, 0);
  rows.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { rows, costoUsado, saldoCant, saldoCosto };
}

// ══════════════════════════════════════════
// EXPORTACIÓN A EXCEL (xlsx-js-style)
// ══════════════════════════════════════════

function xlsxNum(n) { return parseFloat(n) || 0; }

// ── PALETA Y ESTILOS BASE ──
const XC = {
  bg:       'FFFFFF',
  headerBg: '1F6B47',   // verde oscuro para encabezados
  headerTx: 'FFFFFF',
  titleBg:  '0C0F0D',   // casi negro para títulos de empresa/reporte
  titleTx:  'FFFFFF',
  subBg:    'E8F3EC',   // verde muy claro para subtítulos de sección
  subTx:    '1F6B47',
  totalBg:  'D7EDE0',   // verde claro para filas de total
  totalTx:  '0C0F0D',
  grandBg:  '1F6B47',   // verde oscuro para el gran total
  grandTx:  'FFFFFF',
  border:   'B7D8C7',
  text:     '1A1A1A',
  warnBg:   'FCE8D6',
  warnTx:   '8A4B14'
};

const THIN_BORDER = { style: 'thin', color: { rgb: XC.border } };
const ALL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

function cellTitle(text) {
  return { v: text, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: XC.titleTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.titleBg } }, alignment: { horizontal: 'left', vertical: 'center' } } };
}
function cellSubtitle(text) {
  return { v: text, t: 's', s: { font: { italic: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: XC.titleBg } }, alignment: { horizontal: 'left', vertical: 'center' } } };
}
function cellSection(text) {
  return { v: text, t: 's', s: { font: { bold: true, sz: 11, color: { rgb: XC.subTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.subBg } }, alignment: { horizontal: 'left', vertical: 'center' }, border: ALL_BORDERS } };
}
function cellHeader(text, align) {
  return { v: text, t: 's', s: { font: { bold: true, sz: 10, color: { rgb: XC.headerTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.headerBg } }, alignment: { horizontal: align || 'center', vertical: 'center', wrapText: true }, border: ALL_BORDERS } };
}
function cellText(text, opts) {
  opts = opts || {};
  return { v: text, t: 's', s: { font: { bold: !!opts.bold, sz: 10, color: { rgb: opts.color || XC.text } }, alignment: { horizontal: opts.align || 'left', vertical: 'center' }, fill: opts.fill ? { patternType: 'solid', fgColor: { rgb: opts.fill } } : undefined, border: ALL_BORDERS } };
}
function cellNum(num, opts) {
  opts = opts || {};
  return { v: xlsxNum(num), t: 'n', s: { font: { bold: !!opts.bold, sz: 10, color: { rgb: opts.color || XC.text } }, numFmt: opts.numFmt || '"C$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' }, fill: opts.fill ? { patternType: 'solid', fgColor: { rgb: opts.fill } } : undefined, border: ALL_BORDERS } };
}
function cellPct(num, opts) {
  opts = opts || {};
  return { v: xlsxNum(num), t: 'n', s: { font: { bold: !!opts.bold, sz: 10, color: { rgb: opts.color || XC.text } }, numFmt: '0.0%', alignment: { horizontal: 'right', vertical: 'center' }, fill: opts.fill ? { patternType: 'solid', fgColor: { rgb: opts.fill } } : undefined, border: ALL_BORDERS } };
}
function cellTotalLabel(text, span) {
  return { v: text, t: 's', s: { font: { bold: true, sz: 10, color: { rgb: XC.totalTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.totalBg } }, alignment: { horizontal: 'right', vertical: 'center' }, border: ALL_BORDERS } };
}
function cellTotalNum(num, numFmt) {
  return { v: xlsxNum(num), t: 'n', s: { font: { bold: true, sz: 10, color: { rgb: XC.totalTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.totalBg } }, numFmt: numFmt || '"C$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' }, border: ALL_BORDERS } };
}
function cellGrandLabel(text) {
  return { v: text, t: 's', s: { font: { bold: true, sz: 12, color: { rgb: XC.grandTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.grandBg } }, alignment: { horizontal: 'right', vertical: 'center' } } };
}
function cellGrandNum(num, numFmt) {
  return { v: xlsxNum(num), t: 'n', s: { font: { bold: true, sz: 13, color: { rgb: XC.grandTx } }, fill: { patternType: 'solid', fgColor: { rgb: XC.grandBg } }, numFmt: numFmt || '"C$"#,##0.00', alignment: { horizontal: 'right', vertical: 'center' } } };
}
function emptyCell() { return { v: '', t: 's' }; }

// Construye una hoja a partir de una matriz de filas (cada celda ya viene con su estilo
// armado por los helpers cellXxx). Aplica anchos de columna automáticamente.
function buildSheet(rows, colWidths) {
  const ws = {};
  let maxCol = 0;
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === null || cell === undefined) return;
      const addr = XLSX.utils.encode_cell({ r, c });
      ws[addr] = cell;
      if (c > maxCol) maxCol = c;
    });
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: maxCol } });
  if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }));
  return ws;
}

function mergeRange(ws, r1, c1, r2, c2) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

// ── EXPORTAR INVENTARIO ──
function exportInventario() {
  if (state.materiales.length === 0) { toast('No hay materiales para exportar.', 'warn'); return; }
  const empresa = state.empresa ? state.empresa.nombre : 'Empresa';

  const wb = XLSX.utils.book_new();

  // Hoja 1: Inventario general
  const rows = [];
  rows.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rows.push([cellSubtitle('Módulo de inventario — Materiales directos e indirectos'), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rows.push([]);
  rows.push([
    cellHeader('Código'), cellHeader('Material', 'left'), cellHeader('Tipo'), cellHeader('Unidad'),
    cellHeader('Cant. disponible'), cellHeader('Cant. consumida'), cellHeader('Costo unitario'), cellHeader('Costo total')
  ]);

  state.materiales.forEach(m => {
    const tipoColor = m.tipo === 'Directo' ? '2563EB' : 'C2622E';
    rows.push([
      cellText(m.codigo || '—'),
      cellText(m.nombre),
      cellText(m.tipo, { bold: true, color: tipoColor }),
      cellText(m.unidad || '—'),
      cellNum(m.disponible, { numFmt: '#,##0.00' }),
      cellNum(m.cantidad, { numFmt: '#,##0.00' }),
      cellNum(m.costoUnit),
      cellNum(m.total, { bold: true })
    ]);
  });

  const md = state.materiales.filter(x => x.tipo === 'Directo').reduce((a, x) => a + x.total, 0);
  const mi = state.materiales.filter(x => x.tipo === 'Indirecto').reduce((a, x) => a + x.total, 0);

  rows.push([]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Total material directo (MD)'), emptyCell(), cellTotalNum(md)]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Total material indirecto (MI)'), emptyCell(), cellTotalNum(mi)]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellGrandLabel('TOTAL INVENTARIO'), emptyCell(), cellGrandNum(md + mi)]);

  const ws1 = buildSheet(rows, [12, 30, 14, 10, 16, 16, 16, 16]);
  mergeRange(ws1, 0, 0, 0, 7);
  mergeRange(ws1, 1, 0, 1, 7);
  ws1['!rows'] = [{ hpt: 22 }, { hpt: 16 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Inventario');

  // Hoja 2: PEPS por material (solo los que tienen lotes)
  const conPeps = state.materiales.filter(m => m.pepsLotes && m.pepsLotes.length > 0);
  if (conPeps.length > 0) {
    const rowsPeps = [];
    rowsPeps.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
    rowsPeps.push([cellSubtitle('Tarjetas PEPS por material'), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
    rowsPeps.push([]);

    conPeps.forEach(m => {
      const calc = calcPeps(m.pepsLotes);
      rowsPeps.push([cellSection(`Material: ${m.nombre} (${m.codigo || '—'})`), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
      rowsPeps.push([cellHeader('Fecha'), cellHeader('Tipo'), cellHeader('Cantidad'), cellHeader('Costo unit.'), cellHeader('Total')]);
      calc.rows.forEach(r => {
        const tipoColor = r.tipo === 'Entrada' ? '15803D' : 'C2622E';
        rowsPeps.push([
          cellText(r.fecha),
          cellText(r.tipo, { bold: true, color: tipoColor }),
          cellNum(r.cant, { numFmt: '#,##0.00' }),
          cellNum(r.costo),
          cellNum(r.total, { bold: true })
        ]);
      });
      rowsPeps.push([emptyCell(), cellTotalLabel('Saldo en existencia'), cellTotalNum(calc.saldoCant, '#,##0.00'), emptyCell(), cellTotalNum(calc.saldoCosto)]);
      rowsPeps.push([emptyCell(), cellGrandLabel('COSTO USADO (PEPS)'), emptyCell(), emptyCell(), cellGrandNum(calc.costoUsado)]);
      rowsPeps.push([]);
    });

    const ws2 = buildSheet(rowsPeps, [14, 18, 14, 14, 14]);
    mergeRange(ws2, 0, 0, 0, 4);
    mergeRange(ws2, 1, 0, 1, 4);
    XLSX.utils.book_append_sheet(wb, ws2, 'PEPS');
  }

  XLSX.writeFile(wb, `Inventario_${empresa.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  toast('Inventario exportado a Excel.');
}

// ── EXPORTAR NÓMINA ──
function exportNomina() {
  if (state.trabajadores.length === 0) { toast('No hay trabajadores para exportar.', 'warn'); return; }
  const empresa = state.empresa ? state.empresa.nombre : 'Empresa';

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Tabla de nómina general ──
  const rows = [];
  rows.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rows.push([cellSubtitle('Módulo de nómina — Tabla de nómina general'), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rows.push([]);
  rows.push([
    cellHeader('Nombre', 'left'), cellHeader('Cargo', 'left'), cellHeader('Salario base'), cellHeader('Antigüedad'),
    cellHeader('Bonos'), cellHeader('Horas extra (pago)'), cellHeader('Ingresos brutos'), cellHeader('INSS laboral'),
    cellHeader('IR laboral'), cellHeader('Otras ded.'), cellHeader('Total deducciones'), cellHeader('Salario neto'), cellHeader('Clasificación')
  ]);

  const clasifColor = { MOD: '15803D', MOI: 'C2622E', 'Gasto administrativo': '525252', 'Gasto de venta': '7C3AED' };

  state.trabajadores.forEach(t => {
    rows.push([
      cellText(t.nombre),
      cellText(t.cargo || '—'),
      cellNum(t.salario),
      cellNum(t.antiguedad),
      cellNum(t.bonos),
      cellNum(t.pagoHE),
      cellNum(t.bruto, { bold: true }),
      cellNum(t.inss),
      cellNum(t.ir),
      cellNum(t.otras),
      cellNum(t.deducciones),
      cellNum(t.neto, { bold: true }),
      cellText(t.clasif, { bold: true, color: clasifColor[t.clasif] || XC.text })
    ]);
  });

  const mod = state.trabajadores.filter(t => t.clasif === 'MOD').reduce((a, t) => a + t.bruto, 0);
  const moi = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);
  const totBruto = state.trabajadores.reduce((a, t) => a + t.bruto, 0);
  const totInss  = state.trabajadores.reduce((a, t) => a + t.inss, 0);
  const totIr    = state.trabajadores.reduce((a, t) => a + t.ir, 0);
  const totDeduc = state.trabajadores.reduce((a, t) => a + t.deducciones, 0);
  const totNeto  = state.trabajadores.reduce((a, t) => a + t.neto, 0);

  rows.push([]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('TOTALES'), cellTotalNum(totBruto), cellTotalNum(totInss), cellTotalNum(totIr), emptyCell(), cellTotalNum(totDeduc), cellTotalNum(totNeto), emptyCell()]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Total MOD (bruto)'), cellTotalNum(mod), emptyCell()]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Total MOI (bruto)'), cellTotalNum(moi), emptyCell()]);

  const ws = buildSheet(rows, [22, 18, 13, 12, 10, 14, 14, 12, 12, 11, 16, 13, 18]);
  mergeRange(ws, 0, 0, 0, 12);
  mergeRange(ws, 1, 0, 1, 12);
  XLSX.utils.book_append_sheet(wb, ws, 'Nómina');

  // ── Hoja 2: Resumen de obligaciones patronales ──
  const totInssPat    = state.trabajadores.reduce((a, t) => a + t.inssPatronal, 0);
  const totInatec      = state.trabajadores.reduce((a, t) => a + t.inatec, 0);
  const totVacaciones  = state.trabajadores.reduce((a, t) => a + t.vacaciones, 0);
  const totAguinaldo   = state.trabajadores.reduce((a, t) => a + t.aguinaldo, 0);
  const totCargaPat    = totInssPat + totInatec;
  const totProvisiones = totVacaciones + totAguinaldo;
  const tasaPatronalProm = totBruto > 0 ? totInssPat / totBruto : 0.215;

  const rowsPat = [];
  rowsPat.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell()]);
  rowsPat.push([cellSubtitle('Cuadro resumen de obligaciones patronales'), emptyCell(), emptyCell(), emptyCell()]);
  rowsPat.push([]);
  rowsPat.push([cellHeader('Concepto', 'left'), cellHeader('Base de cálculo'), cellHeader('% aplicado'), cellHeader('Total a pagar')]);
  rowsPat.push([cellText('INSS Patronal'), cellNum(totBruto), cellPct(tasaPatronalProm), cellNum(totInssPat, { bold: true })]);
  rowsPat.push([cellText('INATEC'), cellNum(totBruto), cellPct(0.02), cellNum(totInatec, { bold: true })]);
  rowsPat.push([emptyCell(), emptyCell(), cellTotalLabel('Total cargas patronales'), cellTotalNum(totCargaPat)]);
  rowsPat.push([]);
  rowsPat.push([cellText('Provisión Vacaciones'), cellNum(totBruto), cellPct(0.0833), cellNum(totVacaciones, { bold: true })]);
  rowsPat.push([cellText('Provisión Treceavo mes (Aguinaldo)'), cellNum(totBruto), cellPct(0.0833), cellNum(totAguinaldo, { bold: true })]);
  rowsPat.push([emptyCell(), emptyCell(), cellTotalLabel('Total provisiones / prestaciones sociales'), cellTotalNum(totProvisiones)]);
  rowsPat.push([]);
  rowsPat.push([emptyCell(), emptyCell(), cellGrandLabel('COSTO LABORAL TOTAL (Bruto + cargas + provisiones)'), cellGrandNum(totBruto + totCargaPat + totProvisiones)]);

  const wsPat = buildSheet(rowsPat, [44, 18, 16, 18]);
  mergeRange(wsPat, 0, 0, 0, 3);
  mergeRange(wsPat, 1, 0, 1, 3);
  XLSX.utils.book_append_sheet(wb, wsPat, 'Obligaciones patronales');

  // ── Hoja 3: Distribución contable / asiento de diario ──
  const deptos = ['Producción / Costos', 'Administración', 'Ventas'];
  const porDepto = {};
  deptos.forEach(d => porDepto[d] = { bruto: 0, inssPatronal: 0, inatec: 0, vacaciones: 0, aguinaldo: 0 });
  state.trabajadores.forEach(t => {
    const d = deptoDe(t.clasif);
    if (!porDepto[d]) porDepto[d] = { bruto: 0, inssPatronal: 0, inatec: 0, vacaciones: 0, aguinaldo: 0 };
    porDepto[d].bruto        += t.bruto;
    porDepto[d].inssPatronal += t.inssPatronal;
    porDepto[d].inatec       += t.inatec;
    porDepto[d].vacaciones   += t.vacaciones;
    porDepto[d].aguinaldo    += t.aguinaldo;
  });
  const cuentaGasto = {
    'Producción / Costos': 'Costos de producción — Mano de obra',
    'Administración': 'Gastos de administración — Sueldos y salarios',
    'Ventas': 'Gastos de venta — Sueldos y salarios',
    'Otros': 'Otros gastos de personal'
  };
  const totOtras = state.trabajadores.reduce((a, t) => a + t.otras, 0);

  const rowsAsiento = [];
  rowsAsiento.push([cellTitle(empresa), emptyCell(), emptyCell()]);
  rowsAsiento.push([cellSubtitle('Distribución contable — Asiento de diario (planilla)'), emptyCell(), emptyCell()]);
  rowsAsiento.push([]);
  rowsAsiento.push([cellHeader('Cuenta', 'left'), cellHeader('Debe'), cellHeader('Haber')]);

  let totalDebe = 0, totalHaber = 0;
  Object.keys(porDepto).forEach(d => {
    const v = porDepto[d];
    if (v.bruto <= 0) return;
    rowsAsiento.push([cellText(cuentaGasto[d] || d), cellNum(v.bruto), emptyCell()]);
    totalDebe += v.bruto;
  });
  Object.keys(porDepto).forEach(d => {
    const v = porDepto[d];
    const carga = v.inssPatronal + v.inatec;
    if (carga <= 0) return;
    rowsAsiento.push([cellText(`${cuentaGasto[d] || d} — Cargas patronales (INSS + INATEC)`), cellNum(carga), emptyCell()]);
    totalDebe += carga;
  });
  Object.keys(porDepto).forEach(d => {
    const v = porDepto[d];
    const prov = v.vacaciones + v.aguinaldo;
    if (prov <= 0) return;
    rowsAsiento.push([cellText(`${cuentaGasto[d] || d} — Provisión vacaciones y treceavo mes`), cellNum(prov), emptyCell()]);
    totalDebe += prov;
  });

  const haberRows = [
    ['Salarios por pagar (neto a empleados)', totNeto],
    ['INSS por pagar (laboral + patronal)', totInss + totInssPat],
    ['IR por pagar (retención laboral)', totIr],
    ['INATEC por pagar', totInatec],
    ['Vacaciones por pagar (provisión)', totVacaciones],
    ['Aguinaldo / Treceavo mes por pagar (provisión)', totAguinaldo]
  ];
  if (totOtras > 0) haberRows.push(['Otras deducciones por pagar', totOtras]);
  haberRows.forEach(([cuenta, monto]) => {
    if (monto <= 0) return;
    rowsAsiento.push([cellText(cuenta), emptyCell(), cellNum(monto)]);
    totalHaber += monto;
  });

  rowsAsiento.push([]);
  rowsAsiento.push([cellGrandLabel('TOTALES'), cellGrandNum(totalDebe), cellGrandNum(totalHaber)]);

  const wsAsi = buildSheet(rowsAsiento, [55, 18, 18]);
  mergeRange(wsAsi, 0, 0, 0, 2);
  mergeRange(wsAsi, 1, 0, 1, 2);
  XLSX.utils.book_append_sheet(wb, wsAsi, 'Asiento contable');

  XLSX.writeFile(wb, `Nomina_${empresa.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  toast('Nómina exportada a Excel.');
}

// ── EXPORTAR CIF ──
function exportCIF() {
  const empresa = state.empresa ? state.empresa.nombre : 'Empresa';
  const mi  = state.materiales.filter(m => m.tipo === 'Indirecto').reduce((a, m) => a + m.total, 0);
  const moi = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);

  const wb = XLSX.utils.book_new();
  const rows = [];
  rows.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rows.push([cellSubtitle('Módulo de CIF — Costos indirectos de fabricación'), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rows.push([]);
  rows.push([cellHeader('Concepto', 'left'), cellHeader('Tipo de CIF'), cellHeader('Comportamiento'), cellHeader('Área'), cellHeader('Monto (C$)'), cellHeader('Observación', 'left')]);

  const compColor = { Fijo: '525252', Variable: '2563EB', Mixto: '7C3AED' };

  if (mi > 0) rows.push([
    cellText('Materiales indirectos (inventario)'), cellText('Material indirecto'),
    cellText('Variable', { bold: true, color: compColor.Variable }), cellText('Producción'),
    cellNum(mi, { bold: true }), cellText('Integrado desde módulo de inventario')
  ]);
  if (moi > 0) rows.push([
    cellText('Mano de obra indirecta (nómina)'), cellText('MOI'),
    cellText('Fijo', { bold: true, color: compColor.Fijo }), cellText('Producción'),
    cellNum(moi, { bold: true }), cellText('Integrado desde módulo de nómina')
  ]);
  state.cifItems.forEach(c => rows.push([
    cellText(c.concepto), cellText(c.tipo),
    cellText(c.comp, { bold: true, color: compColor[c.comp] || XC.text }), cellText(c.area || '—'),
    cellNum(c.monto, { bold: true }), cellText(c.obs || '—')
  ]));

  const cifFijoExtra     = state.cifItems.filter(c => c.comp === 'Fijo').reduce((a, c) => a + c.monto, 0);
  const cifVariableExtra = state.cifItems.filter(c => c.comp === 'Variable').reduce((a, c) => a + c.monto, 0);
  const cifMixtoExtra    = state.cifItems.filter(c => c.comp === 'Mixto').reduce((a, c) => a + c.monto, 0);
  const totalFijo     = cifFijoExtra + moi;
  const totalVariable = cifVariableExtra + mi;
  const totalMixto    = cifMixtoExtra;
  const total = mi + moi + state.cifItems.reduce((a, c) => a + c.monto, 0);

  rows.push([]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Subtotal CIF Fijo'), cellTotalNum(totalFijo), emptyCell()]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Subtotal CIF Variable'), cellTotalNum(totalVariable), emptyCell()]);
  if (totalMixto > 0) rows.push([emptyCell(), emptyCell(), emptyCell(), cellTotalLabel('Subtotal CIF Mixto'), cellTotalNum(totalMixto), emptyCell()]);
  rows.push([emptyCell(), emptyCell(), emptyCell(), cellGrandLabel('TOTAL CIF'), cellGrandNum(total), emptyCell()]);

  const ws = buildSheet(rows, [36, 22, 14, 18, 16, 32]);
  mergeRange(ws, 0, 0, 0, 5);
  mergeRange(ws, 1, 0, 1, 5);
  XLSX.utils.book_append_sheet(wb, ws, 'CIF');

  XLSX.writeFile(wb, `CIF_${empresa.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  toast('CIF exportado a Excel.');
}

// ── EXPORTAR REPORTE COMPLETO ──
// ── EXPORTAR REPORTE COMPLETO ──
function exportReporte() {
  const empresa  = state.empresa ? state.empresa.nombre : 'Empresa';
  const producto = state.empresa ? state.empresa.producto : '';
  const periodo  = document.getElementById('rep-periodo').value || (state.empresa ? state.empresa.periodo : '');
  const unidades = parseInt(document.getElementById('rep-unidades').value) || parseInt(state.empresa?.unidades) || 0;

  const md    = state.materiales.filter(m => m.tipo === 'Directo').reduce((a, m) => a + m.total, 0);
  const mi    = state.materiales.filter(m => m.tipo === 'Indirecto').reduce((a, m) => a + m.total, 0);
  const mod   = state.trabajadores.filter(t => t.clasif === 'MOD').reduce((a, t) => a + t.bruto, 0);
  const moi   = state.trabajadores.filter(t => t.clasif === 'MOI').reduce((a, t) => a + t.bruto, 0);
  const cifEx = state.cifItems.reduce((a, c) => a + c.monto, 0);
  const totalCIF = mi + moi + cifEx;
  const cTotal   = md + mod + totalCIF;
  const cUnit    = unidades > 0 ? cTotal / unidades : 0;

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen ejecutivo ──
  const rowsRes = [];
  rowsRes.push([cellTitle(empresa), emptyCell(), emptyCell()]);
  rowsRes.push([cellSubtitle('Reporte de costo de producción'), emptyCell(), emptyCell()]);
  rowsRes.push([cellSubtitle(`Producto: ${producto || '—'}  |  Período: ${periodo || '—'}  |  Unidades: ${fmtNum(unidades)}`), emptyCell(), emptyCell()]);
  rowsRes.push([]);
  rowsRes.push([cellHeader('Elemento del costo', 'left'), cellHeader('Monto (C$)'), cellHeader('% del total')]);
  rowsRes.push([cellText('Material directo consumido'), cellNum(md, { bold: true }), cellPct(cTotal > 0 ? md/cTotal : 0)]);
  rowsRes.push([cellText('Mano de obra directa (MOD)'), cellNum(mod, { bold: true }), cellPct(cTotal > 0 ? mod/cTotal : 0)]);
  rowsRes.push([cellText('Costos indirectos de fabricación (CIF)'), cellNum(totalCIF, { bold: true }), cellPct(cTotal > 0 ? totalCIF/cTotal : 0)]);
  rowsRes.push([]);
  rowsRes.push([cellGrandLabel('COSTO TOTAL DE PRODUCCIÓN'), cellGrandNum(cTotal), emptyCell()]);
  rowsRes.push([]);
  rowsRes.push([cellText('Unidades producidas', { bold: true }), cellNum(unidades, { numFmt: '#,##0' }), emptyCell()]);
  rowsRes.push([cellText('COSTO UNITARIO', { bold: true, color: XC.subTx, fill: XC.subBg }), cellNum(cUnit, { bold: true, fill: XC.subBg }), emptyCell()]);
  rowsRes.push([]);
  rowsRes.push([cellText(`Fórmula: MD (${fmtNum(md)}) + MOD (${fmtNum(mod)}) + CIF (${fmtNum(totalCIF)}) = C$ ${fmtNum(cTotal)}`, { bold: false }), emptyCell(), emptyCell()]);

  const wsRes = buildSheet(rowsRes, [40, 18, 14]);
  mergeRange(wsRes, 0, 0, 0, 2);
  mergeRange(wsRes, 1, 0, 1, 2);
  mergeRange(wsRes, 2, 0, 2, 2);
  mergeRange(wsRes, 14, 0, 14, 2);
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen');

  // ── Hoja 2: Desglose CIF ──
  const compColor = { Fijo: '525252', Variable: '2563EB', Mixto: '7C3AED' };
  const rowsCIF = [];
  rowsCIF.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell()]);
  rowsCIF.push([cellSubtitle('Desglose de CIF'), emptyCell(), emptyCell(), emptyCell()]);
  rowsCIF.push([]);
  rowsCIF.push([cellHeader('Concepto', 'left'), cellHeader('Tipo'), cellHeader('Comportamiento'), cellHeader('Monto')]);
  if (mi > 0)  rowsCIF.push([cellText('Materiales indirectos (inv.)'), cellText('Mat. indirecto'), cellText('Variable', { bold: true, color: compColor.Variable }), cellNum(mi, { bold: true })]);
  if (moi > 0) rowsCIF.push([cellText('Mano de obra indirecta (nom.)'), cellText('MOI'), cellText('Fijo', { bold: true, color: compColor.Fijo }), cellNum(moi, { bold: true })]);
  state.cifItems.forEach(c => rowsCIF.push([cellText(c.concepto), cellText(c.tipo), cellText(c.comp, { bold: true, color: compColor[c.comp] || XC.text }), cellNum(c.monto, { bold: true })]));
  rowsCIF.push([]);
  rowsCIF.push([emptyCell(), emptyCell(), cellGrandLabel('TOTAL CIF'), cellGrandNum(totalCIF)]);

  const wsCIF = buildSheet(rowsCIF, [36, 22, 18, 16]);
  mergeRange(wsCIF, 0, 0, 0, 3);
  mergeRange(wsCIF, 1, 0, 1, 3);
  XLSX.utils.book_append_sheet(wb, wsCIF, 'Desglose CIF');

  // ── Hoja 3: Inventario ──
  const rowsInv = [];
  rowsInv.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rowsInv.push([cellSubtitle('Inventario de materiales'), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rowsInv.push([]);
  rowsInv.push([cellHeader('Código'), cellHeader('Material', 'left'), cellHeader('Tipo'), cellHeader('Unidad'), cellHeader('Cant. consumida'), cellHeader('Costo unit.'), cellHeader('Costo total')]);
  const tipoColor = { Directo: '2563EB', Indirecto: 'C2622E' };
  state.materiales.forEach(m => rowsInv.push([
    cellText(m.codigo || '—'), cellText(m.nombre), cellText(m.tipo, { bold: true, color: tipoColor[m.tipo] || XC.text }),
    cellText(m.unidad || '—'), cellNum(m.cantidad, { numFmt: '#,##0.00' }), cellNum(m.costoUnit), cellNum(m.total, { bold: true })
  ]));
  rowsInv.push([]);
  rowsInv.push([emptyCell(), emptyCell(), emptyCell(), emptyCell(), cellGrandLabel('Total MD'), emptyCell(), cellGrandNum(md)]);

  const wsInv = buildSheet(rowsInv, [12, 30, 12, 10, 16, 14, 14]);
  mergeRange(wsInv, 0, 0, 0, 6);
  mergeRange(wsInv, 1, 0, 1, 6);
  XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario');

  // ── Hoja 4: Nómina ──
  const clasifColor = { MOD: '15803D', MOI: 'C2622E', 'Gasto administrativo': '525252', 'Gasto de venta': '7C3AED' };
  const rowsNom = [];
  rowsNom.push([cellTitle(empresa), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rowsNom.push([cellSubtitle('Nómina de producción'), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell()]);
  rowsNom.push([]);
  rowsNom.push([cellHeader('Trabajador', 'left'), cellHeader('Cargo', 'left'), cellHeader('Sal. bruto'), cellHeader('Deducciones'), cellHeader('Sal. neto'), cellHeader('Clasificación')]);
  state.trabajadores.forEach(t => rowsNom.push([
    cellText(t.nombre), cellText(t.cargo || '—'), cellNum(t.bruto, { bold: true }),
    cellNum(t.deducciones), cellNum(t.neto, { bold: true }), cellText(t.clasif, { bold: true, color: clasifColor[t.clasif] || XC.text })
  ]));
  rowsNom.push([]);
  rowsNom.push([emptyCell(), cellTotalLabel('Total MOD'), cellTotalNum(mod), emptyCell(), emptyCell(), emptyCell()]);
  rowsNom.push([emptyCell(), cellTotalLabel('Total MOI'), cellTotalNum(moi), emptyCell(), emptyCell(), emptyCell()]);

  const wsNom = buildSheet(rowsNom, [24, 20, 14, 14, 14, 20]);
  mergeRange(wsNom, 0, 0, 0, 5);
  mergeRange(wsNom, 1, 0, 1, 5);
  XLSX.utils.book_append_sheet(wb, wsNom, 'Nómina');

  XLSX.writeFile(wb, `Reporte_Costos_${empresa.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  toast('Reporte completo exportado a Excel.');
}

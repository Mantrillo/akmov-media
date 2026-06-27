/* ============================================================
   AKMOV MEDIA — ADMIN PANEL JAVASCRIPT
   ============================================================
   Controla:
   - Sistema de login con captcha matemático
   - Control de AutoDJ via API REST (admin-api.js)
   - Editor visual de programación de radio
   - Funciones de copia y reveal de clave
   ============================================================ */

// ─── CONFIGURACIÓN ──────────────────────────────────────────
const CONFIG = {
  ADMIN_PASSWORD: 'akmov2026',   // Contraseña de acceso al panel
  STREAM_KEY:     'abc123',       // Clave de stream de Owncast — CAMBIAR si la modificaste en Owncast
  // URL base de la API del servidor. El servidor Node.js (admin-api.js)
  // debe estar corriendo en el puerto 3001 del servidor Ubuntu.
  API_BASE: 'https://lens-mutual-plymouth-via.trycloudflare.com',
  POLL_INTERVAL: 8000,           // ms entre cada chequeo de estado del AutoDJ
};

// ─── ESTADO LOCAL DE PROGRAMACIÓN ────────────────────────────
// Se guarda en localStorage para persistir entre sesiones
let scheduleData = [];

// ─── CAPTCHA STATE ────────────────────────────────────────────
let captchaAnswer = 0;

// ─── DOM REFS ─────────────────────────────────────────────────
const loginGate   = document.getElementById('loginGate');
const adminPanel  = document.getElementById('adminPanel');
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');
const adminPassEl = document.getElementById('adminPass');

const captchaAEl  = document.getElementById('captchaA');
const captchaBEl  = document.getElementById('captchaB');
const captchaOpEl = document.getElementById('captchaOp');
const captchaIn   = document.getElementById('captchaInput');

const pingDot     = document.getElementById('pingDot');
const pingLabel   = document.getElementById('pingLabel');

const autodjBadge     = document.getElementById('autodjBadge');
const autodjBadgeTxt  = document.getElementById('autodjBadgeText');
const autodjStateEl   = document.getElementById('autodjState');
const autodjUpdatedEl = document.getElementById('autodjUpdated');
const autodjLogEl     = document.getElementById('autodjLog');
const btnStop         = document.getElementById('btnStop');
const btnStart        = document.getElementById('btnStart');

const streamKeyVal    = document.getElementById('streamKeyVal');
const revealKeyBtn    = document.getElementById('revealKeyBtn');

const scheduleList    = document.getElementById('scheduleList');
const addSlotBtn      = document.getElementById('addSlotBtn');
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const saveHint        = document.getElementById('saveHint');

const slotModal       = document.getElementById('slotModal');
const cancelSlot      = document.getElementById('cancelSlot');
const confirmSlot     = document.getElementById('confirmSlot');

const toastWrap       = document.getElementById('toastWrap');
const logoutBtn       = document.getElementById('logoutBtn');

// ─── CAPTCHA ──────────────────────────────────────────────────
function generateCaptcha() {
  const a = Math.floor(Math.random() * 15) + 2;
  const b = Math.floor(Math.random() * 15) + 2;
  const ops = ['+', '-', 'x'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  captchaAEl.textContent = a;
  captchaBEl.textContent = b;
  captchaOpEl.textContent = op;
  captchaIn.value = '';

  if (op === '+')      captchaAnswer = a + b;
  else if (op === '-') captchaAnswer = a - b;
  else                 captchaAnswer = a * b;
}

document.getElementById('refreshCaptcha').addEventListener('click', () => {
  generateCaptcha();
  captchaIn.focus();
});

// Init captcha
generateCaptcha();

// ─── LOGIN ────────────────────────────────────────────────────
function showPanel() {
  loginGate.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  initPanel();
}

function showGate() {
  adminPanel.classList.add('hidden');
  loginGate.classList.remove('hidden');
  generateCaptcha();
}

// Check if already logged in
if (sessionStorage.getItem('akmov_admin') === 'true') {
  showPanel();
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const enteredCaptcha = parseInt(captchaIn.value, 10);
  const enteredPass    = adminPassEl.value.trim();

  if (enteredCaptcha !== captchaAnswer) {
    showError('Respuesta del captcha incorrecta.');
    generateCaptcha();
    return;
  }

  if (enteredPass !== CONFIG.ADMIN_PASSWORD) {
    showError('Contraseña incorrecta.');
    adminPassEl.value = '';
    adminPassEl.focus();
    generateCaptcha();
    return;
  }

  loginError.classList.add('hidden');
  sessionStorage.setItem('akmov_admin', 'true');
  adminPassEl.value = '';
  showPanel();
});

function showError(msg) {
  loginError.textContent = 'ACCESO DENEGADO — ' + msg;
  loginError.classList.remove('hidden');
}

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('akmov_admin');
  stopPolling();
  showGate();
});

// ─── API HELPERS ──────────────────────────────────────────────
async function apiCall(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(CONFIG.API_BASE + path, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function setApiStatus(online) {
  if (online) {
    pingDot.className = 'ping-dot online';
    pingLabel.textContent = 'API ONLINE';
  } else {
    pingDot.className = 'ping-dot offline';
    pingLabel.textContent = 'API OFFLINE';
  }
}

// ─── AUTODJ STATUS ────────────────────────────────────────────
async function fetchAutodjStatus() {
  try {
    const data = await apiCall('/status');
    setApiStatus(true);
    updateAutodjUI(data.active, data.log || '');
  } catch {
    setApiStatus(false);
    updateAutodjUI(null, '// No se puede conectar a la API del servidor.\n// Asegúrate de que admin-api.js esté corriendo en el servidor.');
  }
}

function updateAutodjUI(active, log) {
  const now = new Date().toLocaleTimeString('es-CL');
  autodjUpdatedEl.textContent = now;

  if (active === true) {
    autodjStateEl.textContent = 'ACTIVO ✓';
    autodjStateEl.style.color = 'var(--neon)';
    autodjBadge.className = 'autodj-badge running';
    autodjBadgeTxt.textContent = 'TRANSMITIENDO';
  } else if (active === false) {
    autodjStateEl.textContent = 'DETENIDO';
    autodjStateEl.style.color = 'var(--red)';
    autodjBadge.className = 'autodj-badge stopped';
    autodjBadgeTxt.textContent = 'INACTIVO';
  } else {
    autodjStateEl.textContent = '—';
    autodjStateEl.style.color = '';
    autodjBadge.className = 'autodj-badge';
    autodjBadgeTxt.textContent = 'SIN DATOS';
  }

  if (log) {
    autodjLogEl.textContent = log;
    // Scroll al final del log
    autodjLogEl.scrollTop = autodjLogEl.scrollHeight;
  }
}

// ─── AUTODJ CONTROLS ─────────────────────────────────────────
btnStop.addEventListener('click', async () => {
  btnStop.disabled = true;
  try {
    await apiCall('/autodj/stop', 'POST');
    toast('AutoDJ detenido. OBS puede conectarse.', 'success');
    await fetchAutodjStatus();
  } catch {
    toast('Error al detener el AutoDJ. ¿La API está online?', 'error');
  }
  btnStop.disabled = false;
});

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  try {
    await apiCall('/autodj/start', 'POST');
    toast('AutoDJ iniciado. Retomando transmisión 24/7.', 'success');
    await fetchAutodjStatus();
  } catch {
    toast('Error al iniciar el AutoDJ. ¿La API está online?', 'error');
  }
  btnStart.disabled = false;
});

// ─── POLLING ─────────────────────────────────────────────────
let pollTimer = null;

function startPolling() {
  fetchAutodjStatus();
  pollTimer = setInterval(fetchAutodjStatus, CONFIG.POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ─── STREAM KEY REVEAL ────────────────────────────────────────
let keyRevealed = false;

revealKeyBtn.addEventListener('click', () => {
  keyRevealed = !keyRevealed;
  streamKeyVal.textContent = keyRevealed ? CONFIG.STREAM_KEY : '••••••••';

  // Allow copying when revealed
  if (keyRevealed) {
    revealKeyBtn.setAttribute('data-copy', CONFIG.STREAM_KEY);
    revealKeyBtn.title = 'Copiar clave';
    toast('Clave revelada. Clic de nuevo para copiar.', 'info');
  } else {
    revealKeyBtn.removeAttribute('data-copy');
    revealKeyBtn.title = 'Mostrar/ocultar clave';
  }
});

// ─── COPY BUTTONS ─────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn[data-copy]');
  if (!btn) return;
  const text = btn.getAttribute('data-copy');
  navigator.clipboard.writeText(text).then(() => {
    toast('¡Copiado al portapapeles!', 'success');
  }).catch(() => {
    toast('No se pudo copiar. Cópialo manualmente.', 'error');
  });
});

// ─── SCHEDULE EDITOR ─────────────────────────────────────────
const DEFAULT_SCHEDULE = [
  { start: '06:00', end: '09:00', title: 'AKMOV MAÑANA', desc: 'Información y música para empezar el día.', type: 'autodj' },
  { start: '10:00', end: '12:00', title: 'EL HUASCO DESPIERTA', desc: 'Noticias locales y entrevistas.', type: 'live' },
  { start: '14:00', end: '16:00', title: 'TARDE EN EL HUASCO', desc: 'Música variada y clásicos.', type: 'autodj' },
  { start: '18:00', end: '20:00', title: 'AKMOV BEATS SESSION', desc: 'Conduce: DJ Vektor', type: 'live' },
  { start: '20:00', end: '22:00', title: 'EL HUASCO ROCKS', desc: 'Especial de bandas locales y rock.', type: 'next' },
  { start: '22:00', end: '00:00', title: 'NIGHTWAVE RADAR', desc: 'Synthwave y sonidos nocturnos.', type: 'autodj' },
];

function loadSchedule() {
  const saved = localStorage.getItem('akmov_schedule');
  scheduleData = saved ? JSON.parse(saved) : [...DEFAULT_SCHEDULE];
}

function saveSchedule() {
  localStorage.setItem('akmov_schedule', JSON.stringify(scheduleData));
}

function renderSchedule() {
  scheduleList.innerHTML = '';

  if (scheduleData.length === 0) {
    scheduleList.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);padding:12px">// Sin bloques. Agrega uno con el botón +</p>';
    return;
  }

  // Sort by start time
  const sorted = [...scheduleData].sort((a, b) => a.start.localeCompare(b.start));

  sorted.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'schedule-slot';
    el.innerHTML = `
      <span class="slot-time">${slot.start} → ${slot.end}</span>
      <span class="slot-tag ${slot.type}">${typeLabel(slot.type)}</span>
      <div class="slot-info">
        <div class="slot-title">${slot.title}</div>
        <div class="slot-desc">${slot.desc}</div>
      </div>
      <button class="slot-delete" data-index="${scheduleData.indexOf(slot)}" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    `;
    scheduleList.appendChild(el);
  });
}

function typeLabel(type) {
  return { live: 'EN VIVO', next: 'SIGUIENTE', autodj: 'AUTODJ', repeat: 'REPETICIÓN' }[type] || type;
}

scheduleList.addEventListener('click', (e) => {
  const btn = e.target.closest('.slot-delete');
  if (!btn) return;
  const idx = parseInt(btn.getAttribute('data-index'), 10);
  scheduleData.splice(idx, 1);
  renderSchedule();
  saveHint.textContent = '⚠ Cambios sin guardar';
});

saveScheduleBtn.addEventListener('click', () => {
  saveSchedule();
  saveHint.textContent = '✓ Guardado';
  toast('Programación guardada exitosamente.', 'success');
  setTimeout(() => { saveHint.textContent = ''; }, 3000);
});

// ─── ADD SLOT MODAL ───────────────────────────────────────────
addSlotBtn.addEventListener('click', () => {
  slotModal.classList.remove('hidden');
  document.getElementById('slotTitle').focus();
});

cancelSlot.addEventListener('click', () => {
  slotModal.classList.add('hidden');
  clearModal();
});

slotModal.addEventListener('click', (e) => {
  if (e.target === slotModal) { slotModal.classList.add('hidden'); clearModal(); }
});

confirmSlot.addEventListener('click', () => {
  const start = document.getElementById('slotStart').value;
  const end   = document.getElementById('slotEnd').value;
  const title = document.getElementById('slotTitle').value.trim().toUpperCase();
  const desc  = document.getElementById('slotDesc').value.trim();
  const type  = document.getElementById('slotType').value;

  if (!start || !end || !title) {
    toast('Completa al menos: hora inicio, hora fin y título.', 'error');
    return;
  }

  scheduleData.push({ start, end, title, desc, type });
  renderSchedule();
  saveHint.textContent = '⚠ Cambios sin guardar';
  slotModal.classList.add('hidden');
  clearModal();
  toast(`Bloque "${title}" agregado.`, 'success');
});

function clearModal() {
  document.getElementById('slotStart').value = '';
  document.getElementById('slotEnd').value   = '';
  document.getElementById('slotTitle').value = '';
  document.getElementById('slotDesc').value  = '';
  document.getElementById('slotType').value  = 'live';
}

// ─── TOAST ───────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  toastWrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── INIT PANEL ──────────────────────────────────────────────
function initPanel() {
  loadSchedule();
  renderSchedule();
  startPolling();
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    slotModal.classList.add('hidden');
    clearModal();
  }
});

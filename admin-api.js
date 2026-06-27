/**
 * AKMOV MEDIA — Admin API Server
 * ================================
 * Servidor Node.js Express que expone endpoints REST para controlar
 * el servicio AutoDJ (systemd) desde el panel web.
 *
 * INSTALACIÓN EN EL SERVIDOR UBUNTU:
 *   1. npm install express cors
 *   2. node admin-api.js &   (o configurar como servicio)
 *
 * ENDPOINTS:
 *   GET  /status         → Estado del servicio autodj
 *   POST /autodj/start   → Inicia el servicio autodj
 *   POST /autodj/stop    → Detiene el servicio autodj
 */

const express    = require('express');
const cors       = require('cors');
const { exec }   = require('child_process');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = 3001;

// ─── CORS: Solo permite requests desde tu dominio ─────────────
// Cambia los origins si usas otro puerto o dominio
app.use(cors({
  origin: [
    'http://localhost',
    'http://localhost:8080',
    'http://192.168.1.15',
    'http://192.168.1.15:8080',
    'http://akmovmedia.duckdns.org',
    'http://akmovmedia.duckdns.org:8080',
    // Agrega aquí el origen del panel admin si lo sirves diferente
  ],
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// ─── LOG HELPER ───────────────────────────────────────────────
const LOG_FILE = '/home/mantrillo/autodj.log';

function getLastLogLines(n = 10) {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');
    return lines.slice(-n).join('\n');
  } catch {
    return '// Log no disponible';
  }
}

// ─── STATUS ───────────────────────────────────────────────────
app.get('/status', (req, res) => {
  exec('systemctl is-active autodj', (err, stdout) => {
    const active = stdout.trim() === 'active';
    const log    = getLastLogLines(12);
    res.json({ active, log, timestamp: new Date().toISOString() });
  });
});

// ─── START AUTODJ ─────────────────────────────────────────────
app.post('/autodj/start', (req, res) => {
  exec('sudo systemctl start autodj', (err, stdout, stderr) => {
    if (err) {
      console.error('Error starting autodj:', stderr);
      return res.status(500).json({ success: false, error: stderr });
    }
    res.json({ success: true, message: 'AutoDJ iniciado.' });
  });
});

// ─── STOP AUTODJ ──────────────────────────────────────────────
app.post('/autodj/stop', (req, res) => {
  exec('sudo systemctl stop autodj', (err, stdout, stderr) => {
    if (err) {
      console.error('Error stopping autodj:', stderr);
      return res.status(500).json({ success: false, error: stderr });
    }
    res.json({ success: true, message: 'AutoDJ detenido.' });
  });
});

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ service: 'AKMOV Media Admin API', status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AKMOV Admin API corriendo en http://0.0.0.0:${PORT}`);
});

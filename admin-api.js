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
 *   GET  /status           → Estado del servicio Owncast y estadísticas en vivo
 *   POST /owncast/restart  → Reinicia Owncast (Bypass / Liberar señal)
 */

const express    = require('express');
const cors       = require('cors');
const { exec }   = require('child_process');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = 3001;

// ─── CORS: Permitir acceso general para evitar problemas de origen ─────────────
app.use(cors());

app.use(express.json());

// ─── OBS LOCAL STATUS STORAGE ─────────────────────────────────
let lastObsStatus = {
  online: false,
  scene: '—',
  streaming: false,
  lastUpdate: null
};

// ─── STATUS (Owncast service status + Live stream data + OBS status) ───────
app.get('/status', (req, res) => {
  exec('systemctl is-active owncast', async (err, stdout) => {
    let serviceActive = stdout.trim() === 'active';
    let liveData = { online: false, viewerCount: 0 };
    
    // Intentar conectar al API local de Owncast siempre
    try {
      const response = await fetch('http://localhost:8080/api/status');
      if (response.ok) {
        const data = await response.json();
        liveData = {
          online: data.online || false,
          viewerCount: data.viewerCount || 0,
          lastConnectTime: data.lastConnectTime || null,
          overallMaxViewerCount: data.overallMaxViewerCount || 0,
        };
        // Si el puerto responde, Owncast definitivamente está activo
        serviceActive = true;
      }
    } catch (e) {
      // Si falla la conexión HTTP y systemd dice inactivo, entonces sí está caído
      console.log('Owncast HTTP API offline');
    }

    // Comprobar si el notebook del AutoDJ local se desconectó (ej. más de 30 segs sin reporte)
    const obsOnline = lastObsStatus.lastUpdate && 
                      (new Date() - new Date(lastObsStatus.lastUpdate) < 30000);

    res.json({
      active: serviceActive,
      live: liveData,
      obs: {
        online: !!obsOnline,
        scene: lastObsStatus.scene,
        streaming: lastObsStatus.streaming,
        lastUpdate: lastObsStatus.lastUpdate
      },
      timestamp: new Date().toISOString()
    });
  });
});

// ─── OBS STATUS ENDPOINTS ─────────────────────────────────────
app.post('/obs/status', (req, res) => {
  const { scene, streaming } = req.body;
  lastObsStatus = {
    online: true,
    scene: scene || '—',
    streaming: !!streaming,
    lastUpdate: new Date().toISOString()
  };
  res.json({ success: true });
});

app.get('/obs/status', (req, res) => {
  res.json(lastObsStatus);
});

// ─── SCHEDULE PERSISTENCE ENDPOINTS ───────────────────────────
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');

app.get('/schedule', (req, res) => {
  fs.readFile(SCHEDULE_FILE, 'utf8', (err, data) => {
    if (err) {
      // Si no existe, retornar lista vacía o estructura por defecto
      return res.json({ schedule: [] });
    }
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.json({ schedule: [] });
    }
  });
});

app.post('/schedule', (req, res) => {
  const data = JSON.stringify(req.body, null, 2);
  fs.writeFile(SCHEDULE_FILE, data, 'utf8', (err) => {
    if (err) {
      console.error('Error saving schedule:', err);
      return res.status(500).json({ success: false, error: 'No se pudo guardar la programación.' });
    }
    res.json({ success: true });
  });
});

// ─── RESTART OWNCAST (Bypass / Desconectar emisor actual) ─────
app.post('/owncast/restart', (req, res) => {
  exec('sudo systemctl restart owncast', (err, stdout, stderr) => {
    if (err) {
      console.error('Error restarting owncast:', stderr);
      return res.status(500).json({ success: false, error: stderr });
    }
    res.json({ success: true, message: 'Señal de transmisión liberada.' });
  });
});

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ service: 'AKMOV Media Admin API', status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AKMOV Admin API corriendo en http://0.0.0.0:${PORT}`);
});

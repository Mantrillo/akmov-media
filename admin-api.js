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

// ─── YOUTUBE ON DEMAND CHANNELS CONFIGURATION ─────────────────
const YOUTUBE_CHANNELS = [
  '@lfrsonidoyvideo1920', // Canal principal
  // Agrega aquí hasta 2 canales adicionales si lo deseas (máximo 3 en total)
];

// Helper to fetch and parse the first 3 videos of a channel
async function getRecentVideosFromChannel(handle) {
  const url = `https://www.youtube.com/${handle.startsWith('@') ? handle : '@' + handle}/videos`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) throw new Error(`HTTP error status ${res.status}`);
    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/) || html.match(/window\["ytInitialData"\] = ({.+?});/);
    if (!match) return [];
    
    const data = JSON.parse(match[1]);
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!tabs) return [];
    
    let videoTabContent = null;
    for (const tab of tabs) {
      if (tab.tabRenderer?.content?.richGridRenderer) {
        videoTabContent = tab.tabRenderer.content.richGridRenderer.contents;
        break;
      }
    }
    if (!videoTabContent) return [];
    
    const videos = [];
    for (const item of videoTabContent) {
      const lockup = item.richItemRenderer?.content?.lockupViewModel;
      if (!lockup) continue;
      
      const videoId = lockup.contentId;
      const metaVM = lockup.metadata?.lockupMetadataViewModel;
      if (!videoId || !metaVM) continue;
      
      const title = metaVM.title?.content || 'YouTube Video';
      const parts = metaVM.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts || [];
      const views = parts[0]?.text?.content || '';
      const published = parts[1]?.text?.content || '';
      
      const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      
      videos.push({
        id: videoId,
        title: title,
        thumbnail: thumbnail,
        published: published,
        views: views,
        link: `https://www.youtube.com/watch?v=${videoId}`,
        channel: handle
      });
      
      // Limit to 3 videos per channel
      if (videos.length === 3) break;
    }
    return videos;
  } catch (err) {
    console.error(`Error fetching videos for channel ${handle}:`, err);
    return [];
  }
}

app.get('/youtube/videos', async (req, res) => {
  try {
    const allVideosPromises = YOUTUBE_CHANNELS.slice(0, 3).map(handle => getRecentVideosFromChannel(handle));
    const results = await Promise.all(allVideosPromises);
    
    // Flatten results array
    const combinedVideos = results.flat();
    
    res.json({ success: true, videos: combinedVideos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ service: 'AKMOV Media Admin API', status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AKMOV Admin API corriendo en http://0.0.0.0:${PORT}`);
});

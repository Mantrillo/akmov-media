/**
 * AKMOV MEDIA — Sincronizador Local de OBS Studio (AutoDJ)
 * ========================================================
 * Este script se ejecuta en la notebook Dell Latitude.
 * 
 * Tareas:
 *   1. Descarga la programación desde la API del servidor.
 *   2. Determina el bloque del horario actual.
 *   3. Escribe el archivo 'programa_actual.txt' para que Advanced Scene Switcher reaccione.
 *   4. Se conecta a OBS via WebSocket para monitorear su estado real (escena y emisión).
 *   5. Reporta el estado de OBS de vuelta al servidor para mostrarlo en el Panel de Control Web.
 */

const fs = require('fs');
const path = require('path');
const { OBSWebSocket } = require('obs-websocket-js');

// ─── CONFIGURACIÓN DE CONEXIÓN ────────────────────────────────
const CONFIG = {
  API_BASE: 'https://api.akmovmedia.com',  // Cambia si usas otra URL para la API
  OBS_ADDRESS: 'ws://127.0.0.1:4455',      // Dirección local de OBS WebSocket
  OBS_PASSWORD: 'akmovobs123',             // Debe coincidir con la de OBS (Ajustes -> WebSocket)
  SYNC_INTERVAL: 10000,                    // Sincronizar cada 10 segundos
  TXT_FILE_PATH: path.join(__dirname, 'programa_actual.txt')
};

const obs = new OBSWebSocket();
let obsConnected = false;

// Conectarse a OBS WebSocket
async function connectToOBS() {
  try {
    await obs.connect(CONFIG.OBS_ADDRESS, CONFIG.OBS_PASSWORD);
    console.log('✅ Conectado a OBS Studio via WebSocket.');
    obsConnected = true;
  } catch (err) {
    console.warn('❌ No se pudo conectar a OBS Studio WebSocket. Asegúrate de que OBS esté abierto.');
    obsConnected = false;
    // Reintentar en 15 segundos
    setTimeout(connectToOBS, 15000);
  }
}

// Determinar el programa actual según la programación remota
function getCurrentSlot(schedule) {
  if (!schedule || schedule.length === 0) return null;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of schedule) {
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;

    // Caso especial: bloque que cruza la medianoche (ej. 22:00 -> 02:00)
    if (e < s) {
      if (currentMinutes >= s || currentMinutes < e) return slot;
    } else {
      if (currentMinutes >= s && currentMinutes < e) return slot;
    }
  }
  return null;
}

// Función principal de sincronización
async function syncSchedule() {
  let scheduleSlots = [];
  let currentProgram = 'offline';
  let programTitle = 'SIN PROGRAMACIÓN';

  // 1. Obtener la grilla de programación del Servidor
  try {
    const res = await fetch(`${CONFIG.API_BASE}/schedule`);
    if (res.ok) {
      const data = await res.json();
      scheduleSlots = data.schedule || [];
    }
  } catch (err) {
    console.warn('⚠ Error al obtener programación del servidor:', err.message);
  }

  // 2. Calcular qué programa corresponde a esta hora
  const activeSlot = getCurrentSlot(scheduleSlots);
  if (activeSlot) {
    currentProgram = activeSlot.type; // 'autodj', 'live', 'repeat', etc.
    programTitle = activeSlot.title;
  }

  // 3. Escribir el archivo local que lee el plugin de OBS
  try {
    fs.writeFileSync(CONFIG.TXT_FILE_PATH, currentProgram, 'utf8');
    console.log(`[Sync] Programa: "${programTitle}" | Tipo: "${currentProgram}" -> Escrito a archivo.`);
  } catch (err) {
    console.error('❌ Error al escribir programa_actual.txt:', err.message);
  }

  // 4. Leer estado real de OBS y enviarlo al servidor
  let currentSceneName = '—';
  let isStreaming = false;

  if (obsConnected) {
    try {
      const sceneData = await obs.call('GetCurrentProgramScene');
      currentSceneName = sceneData.currentProgramSceneName;
      
      const streamStatus = await obs.call('GetStreamStatus');
      isStreaming = streamStatus.outputActive;
    } catch (err) {
      console.warn('⚠ Falló lectura de estado de OBS (¿se cerró OBS?):', err.message);
      obsConnected = false;
    }
  }

  // Enviar estado de vuelta a tu Panel Web
  try {
    await fetch(`${CONFIG.API_BASE}/obs/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: currentSceneName,
        streaming: isStreaming
      })
    });
  } catch (err) {
    console.log('⚠ No se pudo enviar telemetría de OBS al servidor web.');
  }
}

// Iniciar
async function start() {
  console.log('=== Iniciando Sincronizador OBS/Panel Web ===');
  console.log(`Guardando archivo de texto en: ${CONFIG.TXT_FILE_PATH}`);
  
  await connectToOBS();
  
  // Sincronizar inmediatamente y luego cada intervalo
  syncSchedule();
  setInterval(syncSchedule, CONFIG.SYNC_INTERVAL);
}

// Manejar caídas de conexión
obs.on('ConnectionClosed', () => {
  console.warn('❌ Conexión con OBS perdida. Reintentando...');
  obsConnected = false;
  setTimeout(connectToOBS, 5000);
});

start();

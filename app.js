document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 0. MAINTENANCE AND ROUTING SYSTEM
  // ==========================================
  const maintenanceScreen = document.getElementById('maintenanceScreen');
  const loginScreen = document.getElementById('loginScreen');
  const mainPortal = document.getElementById('mainPortal');
  const loginForm = document.getElementById('loginForm');
  const adminPassword = document.getElementById('adminPassword');
  const loginError = document.getElementById('loginError');

  // Open access to the main portal: hide maintenance and login views.
  function initPortalAccess() {
    if (maintenanceScreen) maintenanceScreen.classList.add('hidden');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainPortal) mainPortal.classList.remove('hidden');
    
    // Auto-play live video on page load
    setTimeout(() => {
      if (liveVideo && !isVideoPlaying) {
        isVideoPlaying = true;
        if (videoVolumeSlider) videoVolumeSlider.value = 0.3;
        initVideoStream();
        liveVideo.volume = 0.3;
        liveVideo.muted = false;
        if (mainVideoPlayer) mainVideoPlayer.classList.add('live-active');
        
        const iconPlayVideo = videoPlayPauseBtn ? videoPlayPauseBtn.querySelector('.icon-play') : null;
        const iconPauseVideo = videoPlayPauseBtn ? videoPlayPauseBtn.querySelector('.icon-pause') : null;
        const iconVolumeHighVideo = videoMuteBtn ? videoMuteBtn.querySelector('.icon-volume-high') : null;
        const iconVolumeMuteVideo = videoMuteBtn ? videoMuteBtn.querySelector('.icon-volume-mute') : null;

        if (iconPlayVideo) iconPlayVideo.classList.add('hidden');
        if (iconPauseVideo) iconPauseVideo.classList.remove('hidden');
        
        liveVideo.play().catch(err => {
          console.warn("Autoplay block: rendering with sound muted first", err);
          liveVideo.muted = true;
          isVideoMuted = true;
          if (iconVolumeHighVideo) iconVolumeHighVideo.classList.add('hidden');
          if (iconVolumeMuteVideo) iconVolumeMuteVideo.classList.remove('hidden');
          liveVideo.play().catch(e => console.error("Video play failed:", e));
        });
      }
    }, 600);
  }

  // Initial Portal Access
  initPortalAccess();

  // ==========================================
  // 1. LIVE VIDEO PLAYER CONTROL SIMULATION
  // ==========================================
  const mainVideoPlayer = document.getElementById('mainVideoPlayer');
  const liveVideo = document.getElementById('liveVideo');
  const playerCover = document.getElementById('playerCover');
  const videoPlayPauseBtn = document.getElementById('videoPlayPauseBtn');
  const videoMuteBtn = document.getElementById('videoMuteBtn');
  const videoVolumeSlider = document.getElementById('videoVolumeSlider');
  const videoFullscreenBtn = document.getElementById('videoFullscreenBtn');
  const liveTimecode = document.getElementById('liveTimecode');
  
  const STREAM_URL = "https://stream.akmovmedia.com/hls/stream.m3u8";
  let hlsInstance = null;
  let isVideoPlaying = false;
  let isVideoMuted = false;
  let videoVolumeBeforeMute = 0.3;

  // Initialize HLS stream on play
  function initVideoStream() {
    if (!liveVideo || hlsInstance) return; // Already initialized or no video element

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        maxMaxBufferLength: 10,
        liveSyncDuration: 3,
        enableWorker: true
      });
      hlsInstance.loadSource(STREAM_URL);
      hlsInstance.attachMedia(liveVideo);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        liveVideo.play().catch(err => console.warn("Auto-play blocked or stream offline", err));
      });
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS Network Error, trying to recover...");
              hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS Media Error, trying to recover...");
              hlsInstance.recoverMediaError();
              break;
            default:
              console.error("Fatal HLS Error, destroying instance");
              destroyVideoStream();
              break;
          }
        }
      });
    } else if (liveVideo.canPlayType('application/vnd.apple.mpegurl')) {
      // Native iOS HLS support
      liveVideo.src = STREAM_URL;
      liveVideo.addEventListener('loadedmetadata', () => {
        liveVideo.play().catch(err => console.warn("Native auto-play blocked", err));
      });
    }
  }

  function destroyVideoStream() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (liveVideo) {
      liveVideo.src = "";
      liveVideo.load();
    }
  }

  // Toggle Video Play/Pause State
  function toggleVideoPlayback() {
    if (!liveVideo || !videoPlayPauseBtn || !videoMuteBtn) return;
    
    const iconPlayVideo = videoPlayPauseBtn.querySelector('.icon-play');
    const iconPauseVideo = videoPlayPauseBtn.querySelector('.icon-pause');
    const iconVolumeHighVideo = videoMuteBtn.querySelector('.icon-volume-high');
    const iconVolumeMuteVideo = videoMuteBtn.querySelector('.icon-volume-mute');
    
    isVideoPlaying = !isVideoPlaying;
    
    if (isVideoPlaying) {
      // Avoid dual audio overlap: pause audio bar if playing
      if (isAudioPlaying) {
        toggleAudioPlayback();
      }

      initVideoStream();
      
      // Force unmute when initiating playback
      isVideoMuted = false;
      liveVideo.muted = false;
      
      if (videoVolumeSlider) {
        if (parseFloat(videoVolumeSlider.value) === 0) {
          videoVolumeSlider.value = 0.3; // Set to a default audible volume if previously zero
        }
        liveVideo.volume = parseFloat(videoVolumeSlider.value);
      }
      
      if (iconVolumeHighVideo) iconVolumeHighVideo.classList.remove('hidden');
      if (iconVolumeMuteVideo) iconVolumeMuteVideo.classList.add('hidden');
      
      if (mainVideoPlayer) mainVideoPlayer.classList.add('live-active');
      if (playerCover) {
        playerCover.style.opacity = '0';
        setTimeout(() => playerCover.classList.add('hidden'), 300);
      }
      
      if (iconPlayVideo) iconPlayVideo.classList.add('hidden');
      if (iconPauseVideo) iconPauseVideo.classList.remove('hidden');
      
      // Auto-play the video
      if (liveVideo.paused) {
        liveVideo.play().catch(err => console.warn("Play triggered before stream initialized", err));
      }
    } else {
      liveVideo.pause();
      if (mainVideoPlayer) mainVideoPlayer.classList.remove('live-active');
      if (playerCover) {
        playerCover.classList.remove('hidden');
        setTimeout(() => playerCover.style.opacity = '1', 50);
      }
      
      if (iconPlayVideo) iconPlayVideo.classList.remove('hidden');
      if (iconPauseVideo) iconPauseVideo.classList.add('hidden');
    }
  }

  // Bind video player event listeners if elements exist
  if (liveVideo && videoPlayPauseBtn && videoMuteBtn) {
    const iconPlayVideo = videoPlayPauseBtn.querySelector('.icon-play');
    const iconPauseVideo = videoPlayPauseBtn.querySelector('.icon-pause');
    const iconVolumeHighVideo = videoMuteBtn.querySelector('.icon-volume-high');
    const iconVolumeMuteVideo = videoMuteBtn.querySelector('.icon-volume-mute');

    if (playerCover) playerCover.addEventListener('click', toggleVideoPlayback);
    videoPlayPauseBtn.addEventListener('click', toggleVideoPlayback);

    // Mute / Unmute Video Audio
    videoMuteBtn.addEventListener('click', () => {
      isVideoMuted = !isVideoMuted;
      liveVideo.muted = isVideoMuted;
      
      if (isVideoMuted) {
        if (videoVolumeSlider) {
          videoVolumeBeforeMute = parseFloat(videoVolumeSlider.value);
          videoVolumeSlider.value = 0;
        }
        if (iconVolumeHighVideo) iconVolumeHighVideo.classList.add('hidden');
        if (iconVolumeMuteVideo) iconVolumeMuteVideo.classList.remove('hidden');
      } else {
        if (videoVolumeSlider) {
          videoVolumeSlider.value = videoVolumeBeforeMute;
        }
        liveVideo.volume = videoVolumeBeforeMute;
        if (iconVolumeHighVideo) iconVolumeHighVideo.classList.remove('hidden');
        if (iconVolumeMuteVideo) iconVolumeMuteVideo.classList.add('hidden');
      }
    });

    // Volume slider input
    if (videoVolumeSlider) {
      videoVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        liveVideo.volume = val;
        
        if (val === 0) {
          isVideoMuted = true;
          liveVideo.muted = true;
          if (iconVolumeHighVideo) iconVolumeHighVideo.classList.add('hidden');
          if (iconVolumeMuteVideo) iconVolumeMuteVideo.classList.remove('hidden');
        } else {
          isVideoMuted = false;
          liveVideo.muted = false;
          if (iconVolumeHighVideo) iconVolumeHighVideo.classList.remove('hidden');
          if (iconVolumeMuteVideo) iconVolumeMuteVideo.classList.add('hidden');
        }
      });
    }

    // Fullscreen video player
    if (videoFullscreenBtn) {
      videoFullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (mainVideoPlayer) {
            mainVideoPlayer.requestFullscreen().catch(err => {
              console.error(`Error al intentar activar pantalla completa: ${err.message}`);
            });
          }
        } else {
          document.exitFullscreen();
        }
      });
    }
  }

  // Dynamic Timecode (Simulating Broadcast Clock)
  function updateTimecode() {
    if (!liveTimecode) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    // Calculate frames (00-29 based on milliseconds)
    const frames = String(Math.floor((now.getMilliseconds() / 1000) * 30)).padStart(2, '0');
    
    liveTimecode.textContent = `${hours}:${minutes}:${seconds}:${frames}`;
    requestAnimationFrame(updateTimecode);
  }
  if (liveTimecode) {
    requestAnimationFrame(updateTimecode);
  }


  // ==========================================
  // 2. STICKY BOTTOM AUDIO PLAYER & LIVE STREAM
  // ==========================================
  const audioPlayPauseBtn = document.getElementById('audioPlayPauseBtn');
  const footerListenBtn = document.getElementById('footerListenBtn');
  const audioMuteBtn = document.getElementById('audioMuteBtn');
  const audioVolumeSlider = document.getElementById('audioVolumeSlider');
  const liveAudioStream = document.getElementById('liveAudioStream');
  const audioTrackName = document.getElementById('audioTrackName');

  const iconPlayAudio = audioPlayPauseBtn.querySelector('.icon-play');
  const iconPauseAudio = audioPlayPauseBtn.querySelector('.icon-pause');
  const iconVolumeHighAudio = audioMuteBtn.querySelector('.icon-volume-high');
  const iconVolumeMuteAudio = audioMuteBtn.querySelector('.icon-volume-mute');

  let isAudioPlaying = false;
  let isAudioMuted = false;
  let audioVolumeBeforeMute = 0.7;

  // Set initial volume
  liveAudioStream.volume = audioVolumeSlider.value;

  // HLS stream support for audio bar
  let hlsAudioInstance = null;
  function initAudioStream() {
    if (hlsAudioInstance) return;

    if (Hls.isSupported()) {
      hlsAudioInstance = new Hls({
        maxMaxBufferLength: 10,
        liveSyncDuration: 3,
        enableWorker: true
      });
      hlsAudioInstance.loadSource(STREAM_URL);
      hlsAudioInstance.attachMedia(liveAudioStream);
    } else if (liveAudioStream.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / native iOS audio tag HLS support
      liveAudioStream.src = STREAM_URL;
    } else {
      // Fallback
      liveAudioStream.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }
  }

  function toggleAudioPlayback() {
    isAudioPlaying = !isAudioPlaying;

    const vinylPlatter = document.getElementById('vinylPlatter');
    const turntableTonearm = document.getElementById('turntableTonearm');

    if (isAudioPlaying) {
      // Avoid dual audio overlap: pause video player if playing
      if (isVideoPlaying) {
        toggleVideoPlayback();
      }

      initAudioStream();
      liveAudioStream.volume = parseFloat(audioVolumeSlider.value);
      liveAudioStream.muted = isAudioMuted;

      liveAudioStream.play().then(() => {
        audioTrackName.textContent = "TRANSMITIENDO EN VIVO • AUDIO DE LA TRANSMISIÓN DIGITAL HD • HQ AUDIO";
        audioTrackName.style.color = "var(--color-neon)";
      }).catch(err => {
        console.warn("Autoplay block or streaming offline. error:", err);
      });
      
      iconPlayAudio.classList.add('hidden');
      iconPauseAudio.classList.remove('hidden');
      audioPlayPauseBtn.style.boxShadow = "0 0 15px var(--color-neon)";
      
      // Update giant button in footer as well
      const footerPlayIcon = footerListenBtn.querySelector('svg');
      footerPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // Pause icon path
      footerListenBtn.style.borderColor = "var(--color-neon)";

      // Turntable animation active
      if (vinylPlatter) vinylPlatter.classList.add('playing');
      if (turntableTonearm) turntableTonearm.classList.add('playing');
    } else {
      liveAudioStream.pause();
      audioTrackName.textContent = "SEÑAL ONLINE - SINTONÍA DIGITAL STEREO (128 KBPS AAC)";
      audioTrackName.style.color = "var(--color-gray-text)";
      
      iconPlayAudio.classList.remove('hidden');
      iconPauseAudio.classList.add('hidden');
      audioPlayPauseBtn.style.boxShadow = "none";

      // Reset giant button in footer
      const footerPlayIcon = footerListenBtn.querySelector('svg');
      footerPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; // Play icon path
      footerListenBtn.style.borderColor = "var(--color-gray-border)";

      // Turntable animation inactive
      if (vinylPlatter) vinylPlatter.classList.remove('playing');
      if (turntableTonearm) turntableTonearm.classList.remove('playing');
    }
  }

  audioPlayPauseBtn.addEventListener('click', toggleAudioPlayback);
  footerListenBtn.addEventListener('click', toggleAudioPlayback);

  // Mute / Unmute Audio Player
  audioMuteBtn.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    liveAudioStream.muted = isAudioMuted;
    
    if (isAudioMuted) {
      audioVolumeBeforeMute = parseFloat(audioVolumeSlider.value);
      audioVolumeSlider.value = 0;
      iconVolumeHighAudio.classList.add('hidden');
      iconVolumeMuteAudio.classList.remove('hidden');
    } else {
      audioVolumeSlider.value = audioVolumeBeforeMute;
      liveAudioStream.volume = audioVolumeBeforeMute;
      iconVolumeHighAudio.classList.remove('hidden');
      iconVolumeMuteAudio.classList.add('hidden');
    }
  });

  // Volume slider change for audio
  audioVolumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    liveAudioStream.volume = val;
    
    if (val === 0) {
      isAudioMuted = true;
      liveAudioStream.muted = true;
      iconVolumeHighAudio.classList.add('hidden');
      iconVolumeMuteAudio.classList.remove('hidden');
    } else {
      isAudioMuted = false;
      liveAudioStream.muted = false;
      iconVolumeHighAudio.classList.remove('hidden');
      iconVolumeMuteAudio.classList.add('hidden');
    }
  });


// ==========================================
// 4. PROGRAMACIÓN DINÁMICA DESDE LA API
// ==========================================
(async function loadPublicSchedule() {
  const container = document.getElementById('publicScheduleContainer');
  if (!container) return;

  const typeLabels = {
    live:    '<span class="schedule-tag">EN VIVO</span>',
    next:    '<span class="schedule-tag next">Siguiente</span>',
    autodj:  '<span class="schedule-tag autodj">AutoDJ</span>',
    repeat:  '<span class="schedule-tag">Repetición</span>',
  };

  function isCurrentSlot(start, end) {
    const now  = new Date();
    const cur  = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    // Handle midnight wrap (e.g. 22:00 → 00:00)
    if (e < s) return cur >= s || cur < e;
    return cur >= s && cur < e;
  }

  function renderPublicSchedule(slots) {
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    container.innerHTML = sorted.map(slot => {
      const isCurrent = isCurrentSlot(slot.start, slot.end);
      return `
        <div class="schedule-item${isCurrent ? ' current' : ''}">
          <div class="schedule-time">${slot.start} - ${slot.end}</div>
          <div class="schedule-details">
            ${typeLabels[slot.type] || ''}
            <h3>${slot.title}</h3>
            ${slot.desc ? `<p>${slot.desc}</p>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  try {
    const res  = await fetch(AKMOV_API_BASE + '/schedule');
    const data = await res.json();
    if (data && Array.isArray(data.schedule) && data.schedule.length > 0) {
      renderPublicSchedule(data.schedule);
      return;
    }
  } catch { /* API no disponible */ }

  // Fallback: programación por defecto
  const defaultSlots = [
    { start: '06:00', end: '09:00', title: 'AKMOV MAÑANA', desc: 'Información y música para empezar el día.', type: 'autodj' },
    { start: '10:00', end: '12:00', title: 'EL HUASCO DESPIERTA', desc: 'Noticias locales y entrevistas.', type: 'live' },
    { start: '14:00', end: '16:00', title: 'TARDE EN EL HUASCO', desc: 'Música variada y clásicos.', type: 'autodj' },
    { start: '18:00', end: '20:00', title: 'AKMOV BEATS SESSION', desc: 'Conduce: DJ Vektor', type: 'live' },
    { start: '20:00', end: '22:00', title: 'EL HUASCO ROCKS', desc: 'Especial de bandas locales y rock.', type: 'next' },
    { start: '22:00', end: '00:00', title: 'NIGHTWAVE RADAR', desc: 'Synthwave y sonidos nocturnos.', type: 'autodj' },
  ];
  renderPublicSchedule(defaultSlots);
})();
  // ==========================================
  // 3. NAVIGATION INTERACTION (Smooth Scroll & Active Link)
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Highlight active link based on scroll section
  window.addEventListener('scroll', () => {
    let current = "";
    const sections = document.querySelectorAll('section, footer');
    const scrollPosition = window.scrollY + 100; // Offset for navbar

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    if (current) {
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').includes(current)) {
          item.classList.add('active');
        }
      });
    }
  });

  // ==========================================
  // 5. CARGA DINÁMICA DE VIDEOS YOUTUBE (ON DEMAND)
  // ==========================================
  (async function loadYouTubeVideos() {
    const container = document.getElementById('youtubeOnDemandContainer');
    if (!container) return;

    function renderVideos(videos) {
      container.innerHTML = videos.map(video => {
        return `
          <a href="${video.link}" target="_blank" rel="noopener noreferrer" class="ondemand-card">
            <div class="card-thumbnail" style="background-image: url('${video.thumbnail}'); background-size: cover; background-position: center;">
              <div class="thumbnail-overlay">
                <svg viewBox="0 0 24 24" fill="currentColor" class="play-small-icon"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div class="card-badge">YOUTUBE</div>
            </div>
            <div class="card-info">
              <h3>${video.title}</h3>
              <p>${video.views ? `${video.views} • ` : ''}${video.published || ''}</p>
            </div>
          </a>`;
      }).join('');
    }

    try {
      const res = await fetch(AKMOV_API_BASE + '/youtube/videos');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.videos) && data.videos.length > 0) {
        renderVideos(data.videos);
      }
    } catch (err) {
      console.warn("No se pudieron cargar los videos de YouTube desde la API. Usando respaldo estático.", err);
    }
  })();

  // Handle "Otro" checkbox in inscripción form
  const checkInteresOtro = document.getElementById('check-interes-otro');
  const inputInteresOtro = document.getElementById('input-interes-otro');
  if (checkInteresOtro && inputInteresOtro) {
    checkInteresOtro.addEventListener('change', (e) => {
      inputInteresOtro.disabled = !e.target.checked;
      if (e.target.checked) {
        inputInteresOtro.focus();
        inputInteresOtro.required = true;
      } else {
        inputInteresOtro.value = '';
        inputInteresOtro.required = false;
      }
    });
  }

});


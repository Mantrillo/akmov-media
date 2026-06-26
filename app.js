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

  // Secret access password
  const ACCESS_PASSWORD = "akmov2026";

  function checkRouting() {
    const isAuthenticated = localStorage.getItem('akmov_authenticated') === 'true';
    const isSecretRoute = window.location.hash === '#administreichon';

    if (isAuthenticated) {
      if (maintenanceScreen) maintenanceScreen.classList.add('hidden');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (mainPortal) mainPortal.classList.remove('hidden');
      
      // Auto-play live video on portal unlock
      setTimeout(() => {
        if (!isVideoPlaying) {
          isVideoPlaying = true;
          videoVolumeSlider.value = 0.3;
          initVideoStream();
          liveVideo.volume = 0.3;
          liveVideo.muted = false;
          mainVideoPlayer.classList.add('live-active');
          iconPlayVideo.classList.add('hidden');
          iconPauseVideo.classList.remove('hidden');
          
          liveVideo.play().catch(err => {
            console.warn("Autoplay block: rendering with sound muted first", err);
            // Fallback: play muted if blocked by browser autoplay policy
            liveVideo.muted = true;
            isVideoMuted = true;
            iconVolumeHighVideo.classList.add('hidden');
            iconVolumeMuteVideo.classList.remove('hidden');
            liveVideo.play().catch(e => console.error("Video play failed:", e));
          });
        }
      }, 600);
    } else {
      if (mainPortal) mainPortal.classList.add('hidden');
      if (isSecretRoute) {
        if (maintenanceScreen) maintenanceScreen.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (adminPassword) adminPassword.focus();
      } else {
        if (maintenanceScreen) maintenanceScreen.classList.remove('hidden');
        if (loginScreen) loginScreen.classList.add('hidden');
      }
    }
  }

  // Initial Check
  checkRouting();
  window.addEventListener('hashchange', checkRouting);

  // Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (adminPassword && adminPassword.value === ACCESS_PASSWORD) {
        localStorage.setItem('akmov_authenticated', 'true');
        if (loginError) loginError.classList.add('hidden');
        adminPassword.value = '';
        window.location.hash = ''; // Clear hash to show homepage
        checkRouting();
      } else {
        if (loginError) loginError.classList.remove('hidden');
        if (adminPassword) {
          adminPassword.value = '';
          adminPassword.focus();
        }
      }
    });
  }

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
  
  const iconPlayVideo = videoPlayPauseBtn.querySelector('.icon-play');
  const iconPauseVideo = videoPlayPauseBtn.querySelector('.icon-pause');
  const iconVolumeHighVideo = videoMuteBtn.querySelector('.icon-volume-high');
  const iconVolumeMuteVideo = videoMuteBtn.querySelector('.icon-volume-mute');

  const STREAM_URL = "https://stream.akmovmedia.com/hls/stream.m3u8";
  let hlsInstance = null;
  let isVideoPlaying = false;
  let isVideoMuted = false;
  let videoVolumeBeforeMute = 0.3;

  // Initialize HLS stream on play
  function initVideoStream() {
    if (hlsInstance) return; // Already initialized

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
    isVideoPlaying = !isVideoPlaying;
    
    if (isVideoPlaying) {
      // Avoid dual audio overlap: pause audio bar if playing
      if (isAudioPlaying) {
        toggleAudioPlayback();
      }

      initVideoStream();
      liveVideo.volume = parseFloat(videoVolumeSlider.value);
      liveVideo.muted = isVideoMuted;
      
      mainVideoPlayer.classList.add('live-active');
      if (playerCover) {
        playerCover.style.opacity = '0';
        setTimeout(() => playerCover.classList.add('hidden'), 300);
      }
      
      iconPlayVideo.classList.add('hidden');
      iconPauseVideo.classList.remove('hidden');
      
      // Auto-play the video
      if (liveVideo.paused) {
        liveVideo.play().catch(err => console.warn("Play triggered before stream initialized", err));
      }
    } else {
      liveVideo.pause();
      mainVideoPlayer.classList.remove('live-active');
      if (playerCover) {
        playerCover.classList.remove('hidden');
        setTimeout(() => playerCover.style.opacity = '1', 50);
      }
      
      iconPlayVideo.classList.remove('hidden');
      iconPauseVideo.classList.add('hidden');
    }
  }

  if (playerCover) playerCover.addEventListener('click', toggleVideoPlayback);
  videoPlayPauseBtn.addEventListener('click', toggleVideoPlayback);

  // Mute / Unmute Video Audio
  videoMuteBtn.addEventListener('click', () => {
    isVideoMuted = !isVideoMuted;
    liveVideo.muted = isVideoMuted;
    
    if (isVideoMuted) {
      videoVolumeBeforeMute = parseFloat(videoVolumeSlider.value);
      videoVolumeSlider.value = 0;
      iconVolumeHighVideo.classList.add('hidden');
      iconVolumeMuteVideo.classList.remove('hidden');
    } else {
      videoVolumeSlider.value = videoVolumeBeforeMute;
      liveVideo.volume = videoVolumeBeforeMute;
      iconVolumeHighVideo.classList.remove('hidden');
      iconVolumeMuteVideo.classList.add('hidden');
    }
  });

  // Volume slider input
  videoVolumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    liveVideo.volume = val;
    
    if (val === 0) {
      isVideoMuted = true;
      liveVideo.muted = true;
      iconVolumeHighVideo.classList.add('hidden');
      iconVolumeMuteVideo.classList.remove('hidden');
    } else {
      isVideoMuted = false;
      liveVideo.muted = false;
      iconVolumeHighVideo.classList.remove('hidden');
      iconVolumeMuteVideo.classList.add('hidden');
    }
  });

  // Fullscreen video player
  videoFullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      mainVideoPlayer.requestFullscreen().catch(err => {
        console.error(`Error al intentar activar pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Dynamic Timecode (Simulating Broadcast Clock)
  function updateTimecode() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    // Calculate frames (00-29 based on milliseconds)
    const frames = String(Math.floor((now.getMilliseconds() / 1000) * 30)).padStart(2, '0');
    
    if (liveTimecode) {
      liveTimecode.textContent = `${hours}:${minutes}:${seconds}:${frames}`;
    }
    requestAnimationFrame(updateTimecode);
  }
  requestAnimationFrame(updateTimecode);


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

});


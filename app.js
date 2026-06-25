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

  let isVideoPlaying = false;
  let isVideoMuted = false;
  let videoVolumeBeforeMute = 0.8;

  // Toggle Video Play/Pause State
  function toggleVideoPlayback() {
    isVideoPlaying = !isVideoPlaying;
    
    if (isVideoPlaying) {
      mainVideoPlayer.classList.add('live-active');
      playerCover.style.opacity = '0';
      setTimeout(() => playerCover.classList.add('hidden'), 300);
      
      iconPlayVideo.classList.add('hidden');
      iconPauseVideo.classList.remove('hidden');
    } else {
      mainVideoPlayer.classList.remove('live-active');
      playerCover.classList.remove('hidden');
      setTimeout(() => playerCover.style.opacity = '1', 50);
      
      iconPlayVideo.classList.remove('hidden');
      iconPauseVideo.classList.add('hidden');
    }
  }

  playerCover.addEventListener('click', toggleVideoPlayback);
  videoPlayPauseBtn.addEventListener('click', toggleVideoPlayback);

  // Mute / Unmute Video Audio
  videoMuteBtn.addEventListener('click', () => {
    isVideoMuted = !isVideoMuted;
    if (isVideoMuted) {
      videoVolumeBeforeMute = parseFloat(videoVolumeSlider.value);
      videoVolumeSlider.value = 0;
      iconVolumeHighVideo.classList.add('hidden');
      iconVolumeMuteVideo.classList.remove('hidden');
    } else {
      videoVolumeSlider.value = videoVolumeBeforeMute;
      iconVolumeHighVideo.classList.remove('hidden');
      iconVolumeMuteVideo.classList.add('hidden');
    }
  });

  // Volume slider input
  videoVolumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val === 0) {
      isVideoMuted = true;
      iconVolumeHighVideo.classList.add('hidden');
      iconVolumeMuteVideo.classList.remove('hidden');
    } else {
      isVideoMuted = false;
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

  function toggleAudioPlayback() {
    isAudioPlaying = !isAudioPlaying;

    if (isAudioPlaying) {
      liveAudioStream.play().then(() => {
        audioTrackName.textContent = "TRANSMITIENDO EN VIVO • SEÑAL DIGITAL STEREO (128 KBPS AAC) • HQ AUDIO";
        audioTrackName.style.color = "var(--color-neon)";
      }).catch(err => {
        console.warn("Autoplay block or streaming offline. Playing simulated track. error:", err);
        // Play fallback if stream fails
        liveAudioStream.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        liveAudioStream.play();
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

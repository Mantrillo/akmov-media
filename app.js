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

  const STREAM_URL = "https://stream.akmovmedia.com/memfs/20305e48-e2ba-44e5-9a9c-f9858f65b857.m3u8";
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

  // ==========================================
  // 4. LIVE CHAT SYSTEM (OWNCAST-STYLE) WITH CUSTOM EMOJIS & MODERATION
  // ==========================================
  const chatStatus = document.getElementById('chatStatus');
  const chatMessages = document.getElementById('chatMessages');
  const chatNickArea = document.getElementById('chatNickArea');
  const chatNickInput = document.getElementById('chatNickInput');
  const chatNickBtn = document.getElementById('chatNickBtn');
  const chatMsgArea = document.getElementById('chatMsgArea');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const userNickSpan = document.getElementById('userNickSpan');
  const userNickDisplay = document.getElementById('userNickDisplay');
  const chatEmojiBtn = document.getElementById('chatEmojiBtn');
  const chatAdminEmojisBtn = document.getElementById('chatAdminEmojisBtn');
  const emojiPopover = document.getElementById('emojiPopover');
  const adminEmojiManager = document.getElementById('adminEmojiManager');
  const adminEmojiName = document.getElementById('adminEmojiName');
  const adminEmojiUrl = document.getElementById('adminEmojiUrl');
  const adminEmojiAddBtn = document.getElementById('adminEmojiAddBtn');
  const chatPinnedArea = document.getElementById('chatPinnedArea');
  const pinnedContent = document.getElementById('pinnedContent');
  const pinnedUnpinBtn = document.getElementById('pinnedUnpinBtn');

  // Check if admin is authenticated
  const isAdmin = localStorage.getItem('akmov_authenticated') === 'true';
  if (isAdmin) {
    if (chatAdminEmojisBtn) chatAdminEmojisBtn.classList.remove('hidden');
  }

  // Username
  let currentNickname = localStorage.getItem('akmov_chat_nick') || '';
  
  // Custom Emojis Registry
  const defaultCustomEmojis = {
    ':akmov:': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300FF00"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/></svg>',
    ':live:': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="%23FF0000"/></svg>',
    ':metal:': 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f918.png',
    ':beats:': 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f3a7.png'
  };

  let customEmojis = {};
  try {
    const saved = localStorage.getItem('akmov_custom_emojis');
    customEmojis = saved ? JSON.parse(saved) : defaultCustomEmojis;
  } catch (e) {
    customEmojis = defaultCustomEmojis;
  }

  // Pinned message state
  let pinnedMessage = null;

  // Active WebSocket or local channel
  let socket = null;
  let localChannel = null;
  let useFallback = false;
  let lastUserActivity = 0;

  // Muted users list (local-only moderation helper)
  const mutedUsers = new Set();

  // Setup username UI on load
  if (currentNickname) {
    showChatInput();
  }

  function showChatInput() {
    if (chatNickArea) chatNickArea.classList.add('hidden');
    if (chatMsgArea) chatMsgArea.classList.remove('hidden');
    if (userNickSpan) userNickSpan.textContent = currentNickname;
  }

  function showNickConfig() {
    if (chatNickArea) chatNickArea.classList.remove('hidden');
    if (chatMsgArea) chatMsgArea.classList.add('hidden');
    if (chatNickInput) {
      chatNickInput.value = currentNickname;
      chatNickInput.focus();
    }
  }

  if (chatNickBtn && chatNickInput) {
    chatNickBtn.addEventListener('click', saveNickname);
    chatNickInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveNickname();
    });
  }

  if (userNickDisplay) {
    userNickDisplay.addEventListener('click', showNickConfig);
  }

  function saveNickname() {
    const nick = chatNickInput.value.trim();
    if (!nick) return;
    
    const oldNick = currentNickname;
    currentNickname = nick;
    localStorage.setItem('akmov_chat_nick', nick);
    showChatInput();

    // Broadcast join/change system message
    const joinText = oldNick ? `"${oldNick}" cambió su nombre a "${nick}"` : `"${nick}" se unió al chat`;
    sendChatMessage(joinText, true);
  }

  // Username coloring
  function getUsernameColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#00FF00', '#FF3399', '#33CCFF', '#FFCC00', '#FF6633', '#CC66FF', '#33FF99'];
    return colors[Math.abs(hash) % colors.length];
  }

  // HTML escaping utility
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Parse custom emojis
  function parseEmojis(text) {
    let escaped = escapeHTML(text);
    
    // Replace custom emojis shortcodes
    const allEmojis = { ...defaultCustomEmojis, ...customEmojis };
    for (const [shortcode, url] of Object.entries(allEmojis)) {
      const regex = new RegExp(shortcode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      escaped = escaped.replace(regex, `<img class="custom-emoji" src="${url}" alt="${shortcode}" title="${shortcode}">`);
    }
    return escaped;
  }

  // ==========================================
  // WEBSOCKET & FALLBACK BROADCAST CHANNEL
  // ==========================================
  function initChatConnection() {
    if (chatStatus) {
      chatStatus.textContent = "● CONECTANDO";
      chatStatus.className = "chat-status-indicator";
    }

    try {
      socket = new WebSocket('wss://chat.akmovmedia.com');
      
      socket.onopen = () => {
        console.log("WebSocket chat connected");
        useFallback = false;
        if (chatStatus) {
          chatStatus.textContent = "● EN LÍNEA";
          chatStatus.className = "chat-status-indicator";
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (e) {
          console.warn("Error parsing WS message:", e);
        }
      };

      socket.onerror = () => {
        console.warn("WebSocket error, falling back to local BroadcastChannel");
        setupBroadcastFallback();
      };

      socket.onclose = () => {
        console.log("WebSocket closed, falling back to local BroadcastChannel");
        setupBroadcastFallback();
      };

    } catch (err) {
      console.warn("WS connection failed:", err);
      setupBroadcastFallback();
    }
  }

  function setupBroadcastFallback() {
    useFallback = true;
    if (chatStatus) {
      chatStatus.textContent = "● LOCAL";
      chatStatus.className = "chat-status-indicator";
    }

    if (!localChannel) {
      localChannel = new BroadcastChannel('akmov_chat_channel');
      localChannel.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };
    }
  }

  initChatConnection();

  // Send message
  function sendChatMessage(text, isSystem = false) {
    if (!text.trim()) return;

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const msg = {
      id: msgId,
      type: isSystem ? 'system' : 'chat',
      author: currentNickname || 'Invitado',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: isAdmin
    };

    if (!useFallback && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else {
      // Local fallback broadcast
      if (localChannel) {
        localChannel.postMessage(msg);
      }
      handleIncomingMessage(msg); // Render locally
    }

    lastUserActivity = Date.now();
  }

  // Send message button event
  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', () => {
      sendChatMessage(chatInput.value);
      chatInput.value = '';
      emojiPopover.classList.add('hidden');
    });

    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage(chatInput.value);
        chatInput.value = '';
        emojiPopover.classList.add('hidden');
      }
    });
  }

  // Handle incoming messages (chat, system, moderation)
  function handleIncomingMessage(msg) {
    if (msg.type === 'delete') {
      const el = document.getElementById(msg.id);
      if (el) el.remove();
      return;
    }

    if (msg.type === 'pin') {
      pinnedMessage = msg;
      renderPinnedMessage();
      return;
    }

    if (msg.type === 'unpin') {
      pinnedMessage = null;
      renderPinnedMessage();
      return;
    }

    if (msg.type === 'ban') {
      mutedUsers.add(msg.user);
      // Remove all past messages from banned user
      document.querySelectorAll('.chat-msg').forEach(el => {
        const authorNode = el.querySelector('.msg-author');
        if (authorNode && authorNode.textContent === msg.user) {
          el.remove();
        }
      });
      return;
    }

    if (msg.type === 'custom_emoji_added') {
      customEmojis[msg.name] = msg.url;
      localStorage.setItem('akmov_custom_emojis', JSON.stringify(customEmojis));
      buildEmojiPicker();
      return;
    }

    // Render Chat or System Message
    if (mutedUsers.has(msg.author)) return; // Skip if muted locally

    const msgElement = document.createElement('div');
    msgElement.id = msg.id;
    msgElement.className = `chat-msg ${msg.type}`;
    if (msg.isAdmin) msgElement.classList.add('moderator');

    if (msg.type === 'system') {
      msgElement.innerHTML = `<span class="msg-text">${escapeHTML(msg.text)}</span>`;
    } else {
      const color = getUsernameColor(msg.author);
      const modBadge = msg.isAdmin ? `<span class="msg-badge badge-mod">Admin</span>` : '';
      
      // Admin moderation action buttons
      let actionButtons = '';
      if (isAdmin) {
        actionButtons = `
          <div class="msg-actions">
            <button class="action-btn btn-pin" title="Fijar mensaje" data-id="${msg.id}">📌</button>
            <button class="action-btn btn-ban" title="Mutear usuario" data-author="${msg.author}">🚫</button>
            <button class="action-btn btn-delete" title="Eliminar mensaje" data-id="${msg.id}">🗑️</button>
          </div>
        `;
      }

      msgElement.innerHTML = `
        <div class="msg-header">
          <div class="msg-meta">
            <span class="msg-time">${msg.time}</span>
            <span class="msg-author" style="color: ${color}">${escapeHTML(msg.author)}</span>
            ${modBadge}
          </div>
          ${actionButtons}
        </div>
        <div class="msg-body">${parseEmojis(msg.text)}</div>
      `;

      // Bind moderation buttons
      if (isAdmin) {
        msgElement.querySelector('.btn-delete').addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          sendModerationCommand('delete', { id });
        });
        msgElement.querySelector('.btn-pin').addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          sendModerationCommand('pin', { id, author: msg.author, text: msg.text, time: msg.time });
        });
        msgElement.querySelector('.btn-ban').addEventListener('click', (e) => {
          const author = e.target.getAttribute('data-author');
          if (confirm(`¿Mudar y banear localmente a ${author}?`)) {
            sendModerationCommand('ban', { user: author });
          }
        });
      }
    }

    if (chatMessages) {
      chatMessages.appendChild(msgElement);
      // Auto scroll
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function sendModerationCommand(type, data) {
    const cmd = { type, ...data };
    if (!useFallback && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(cmd));
    } else {
      if (localChannel) localChannel.postMessage(cmd);
      handleIncomingMessage(cmd); // apply locally
    }
  }

  // ==========================================
  // PINNED MESSAGES RENDER
  // ==========================================
  function renderPinnedMessage() {
    if (!pinnedMessage) {
      if (chatPinnedArea) chatPinnedArea.classList.add('hidden');
      return;
    }

    if (chatPinnedArea && pinnedContent) {
      pinnedContent.innerHTML = `
        <span class="msg-author" style="color: ${getUsernameColor(pinnedMessage.author)}">${escapeHTML(pinnedMessage.author)}</span>: 
        <span>${parseEmojis(pinnedMessage.text)}</span>
      `;
      chatPinnedArea.classList.remove('hidden');
    }
  }

  if (pinnedUnpinBtn) {
    if (isAdmin) {
      pinnedUnpinBtn.classList.remove('hidden');
      pinnedUnpinBtn.addEventListener('click', () => {
        sendModerationCommand('unpin', {});
      });
    } else {
      pinnedUnpinBtn.classList.add('hidden');
    }
  }

  // ==========================================
  // EMOJI POPULATION & EMOJI PICKER POP-OVER
  // ==========================================
  const standardEmojis = ['😊', '🔥', '👍', '🎉', '🎧', '⚡', '🙌', '🎸', '❤️', '👀', '🤣', '😮'];

  function buildEmojiPicker() {
    if (!emojiPopover) return;
    emojiPopover.innerHTML = '';

    // Standard emojis
    standardEmojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-popover-item';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        if (chatInput) {
          chatInput.value += emoji;
          chatInput.focus();
        }
      });
      emojiPopover.appendChild(btn);
    });

    // Custom emojis
    const allCustom = { ...defaultCustomEmojis, ...customEmojis };
    for (const [name, url] of Object.entries(allCustom)) {
      const btn = document.createElement('button');
      btn.className = 'emoji-popover-item';
      btn.title = name;
      btn.innerHTML = `<img src="${url}" alt="${name}">`;
      btn.addEventListener('click', () => {
        if (chatInput) {
          chatInput.value += ` ${name} `;
          chatInput.focus();
        }
      });
      emojiPopover.appendChild(btn);
    }
  }

  buildEmojiPicker();

  if (chatEmojiBtn) {
    chatEmojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (emojiPopover) emojiPopover.classList.toggle('hidden');
      if (adminEmojiManager) adminEmojiManager.classList.add('hidden');
    });
  }

  if (chatAdminEmojisBtn) {
    chatAdminEmojisBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (adminEmojiManager) adminEmojiManager.classList.toggle('hidden');
      if (emojiPopover) emojiPopover.classList.add('hidden');
    });
  }

  // Click outside to close emoji panels
  document.addEventListener('click', () => {
    if (emojiPopover) emojiPopover.classList.add('hidden');
    if (adminEmojiManager) adminEmojiManager.classList.add('hidden');
  });

  if (emojiPopover) emojiPopover.addEventListener('click', e => e.stopPropagation());
  if (adminEmojiManager) adminEmojiManager.addEventListener('click', e => e.stopPropagation());

  // Add custom emoji (Admin only)
  if (adminEmojiAddBtn && adminEmojiName && adminEmojiUrl) {
    adminEmojiAddBtn.addEventListener('click', () => {
      let name = adminEmojiName.value.trim().toLowerCase();
      const url = adminEmojiUrl.value.trim();

      if (!name || !url) {
        alert("Por favor rellena el nombre y la URL de la imagen.");
        return;
      }

      if (!name.startsWith(':')) name = ':' + name;
      if (!name.endsWith(':')) name = name + ':';

      const updateCmd = { type: 'custom_emoji_added', name, url };
      if (!useFallback && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(updateCmd));
      } else {
        if (localChannel) localChannel.postMessage(updateCmd);
        handleIncomingMessage(updateCmd);
      }

      adminEmojiName.value = '';
      adminEmojiUrl.value = '';
      adminEmojiManager.classList.add('hidden');
    });
  }

  // ==========================================
  // SIMULATION BOT (MAKES THE PORTAL FEEL ALIVE)
  // ==========================================
  const simulatedUsers = [
    { name: 'DJ_Vektor', isAdmin: false },
    { name: 'Huasco_Beat', isAdmin: false },
    { name: 'K-Rocker', isAdmin: false },
    { name: 'Aluvion_Sonoro', isAdmin: false },
    { name: 'Antofagasta_Vibe', isAdmin: false },
    { name: 'Cyber_Punk_99', isAdmin: false }
  ];

  const simulatedMessages = [
    'Tremendo set! 🔥',
    'Se escucha increíble desde Vallenar',
    'Sube el volumen!!! ⚡',
    'El Huasco está en el aire 📻',
    ':akmov: :live: :akmov:',
    'Buenísima la calidad de transmisión',
    'Apoyando la música local! 🎸',
    '¡Qué temazo! 🎧',
    'Saludos a toda la gente de la región!',
    'Excelente portal :akmov: ¡Se pasaron!'
  ];

  function runSimulationBot() {
    // Only simulate if using local fallback, and user is logged in/nick set
    if (!useFallback || !currentNickname) return;

    // Skip if user was active recently (last 20 seconds) to avoid interrupting
    if (Date.now() - lastUserActivity < 20000) return;

    const user = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];
    const text = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];
    
    const msgId = 'msg_sim_' + Date.now();
    const msg = {
      id: msgId,
      type: 'chat',
      author: user.name,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: user.isAdmin
    };

    handleIncomingMessage(msg);
  }

  // Simulate every 25 seconds
  setInterval(runSimulationBot, 25000);

});


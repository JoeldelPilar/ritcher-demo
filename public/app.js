// Ritcher Demo — HLS.js Player with Ad Break Detection

const video = document.getElementById("video");
const playBtn = document.getElementById("play-btn");
const loadBtn = document.getElementById("load-btn");
const volumeSlider = document.getElementById("volume");
const stitcherUrlInput = document.getElementById("stitcher-url");
const originUrlInput = document.getElementById("origin-url");
const sessionIdEl = document.getElementById("session-id");
const streamStatusEl = document.getElementById("stream-status");
const currentFragEl = document.getElementById("current-frag");
const adBreakCountEl = document.getElementById("ad-break-count");
const playbackUrlEl = document.getElementById("playback-url");
const adOverlay = document.getElementById("ad-overlay");

let hls = null;
let adBreakCount = 0;
let isInAdBreak = false;

function generateSessionId() {
  return "demo-" + Math.random().toString(36).substring(2, 10);
}

function buildPlaybackUrl() {
  const baseUrl = stitcherUrlInput.value.replace(/\/+$/, "");
  const sessionId = generateSessionId();
  const originUrl = originUrlInput.value.trim();

  let url;
  if (originUrl) {
    url = `${baseUrl}/stitch/${sessionId}/playlist.m3u8?origin=${encodeURIComponent(originUrl)}`;
  } else {
    // Use Ritcher's built-in demo playlist
    const demoOrigin = `${baseUrl}/demo/playlist.m3u8`;
    url = `${baseUrl}/stitch/${sessionId}/playlist.m3u8?origin=${encodeURIComponent(demoOrigin)}`;
  }

  return { url, sessionId };
}

function setStatus(text, className) {
  streamStatusEl.textContent = text;
  streamStatusEl.className = `info-value ${className}`;
}

function showAdOverlay(show) {
  if (show) {
    adOverlay.classList.remove("hidden");
    setStatus("Ad Break", "status-ad");
  } else {
    adOverlay.classList.add("hidden");
    setStatus("Playing", "status-playing");
  }
}

function loadStream() {
  // Cleanup previous instance
  if (hls) {
    hls.destroy();
    hls = null;
  }

  adBreakCount = 0;
  isInAdBreak = false;
  adBreakCountEl.textContent = "0";
  showAdOverlay(false);
  setStatus("Loading...", "status-loading");

  const { url, sessionId } = buildPlaybackUrl();
  sessionIdEl.textContent = sessionId;
  playbackUrlEl.textContent = url;

  if (!Hls.isSupported()) {
    // Fallback for Safari (native HLS)
    video.src = url;
    video.addEventListener("loadedmetadata", () => {
      setStatus("Playing", "status-playing");
      playBtn.textContent = "Pause";
      playBtn.disabled = false;
    });
    video.play();
    return;
  }

  hls = new Hls({
    debug: false,
    enableWorker: true,
    lowLatencyMode: false,
  });

  hls.loadSource(url);
  hls.attachMedia(video);

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    setStatus("Ready", "status-playing");
    playBtn.textContent = "Play";
    playBtn.disabled = false;
  });

  hls.on(Hls.Events.FRAG_CHANGED, (_event, data) => {
    const frag = data.frag;
    currentFragEl.textContent = `#${frag.sn} (${frag.duration.toFixed(1)}s)`;

    // Detect ad break via fragment URL pattern
    const isAd = frag.url && frag.url.includes("/ad/");
    if (isAd && !isInAdBreak) {
      isInAdBreak = true;
      adBreakCount++;
      adBreakCountEl.textContent = adBreakCount;
      showAdOverlay(true);
    } else if (!isAd && isInAdBreak) {
      isInAdBreak = false;
      showAdOverlay(false);
    }
  });

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      setStatus(`Error: ${data.type}`, "status-error");
      console.error("HLS fatal error:", data);

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        // Try to recover
        setTimeout(() => hls.startLoad(), 2000);
      }
    }
  });
}

// Event listeners
loadBtn.addEventListener("click", loadStream);

playBtn.addEventListener("click", () => {
  if (video.paused) {
    video.play();
    playBtn.textContent = "Pause";
    if (!isInAdBreak) {
      setStatus("Playing", "status-playing");
    }
  } else {
    video.pause();
    playBtn.textContent = "Play";
    setStatus("Paused", "status-idle");
  }
});

volumeSlider.addEventListener("input", (e) => {
  video.volume = parseFloat(e.target.value);
});

// Enter key loads stream
stitcherUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadStream();
});
originUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadStream();
});

// Init
video.volume = 0.5;
setStatus("Idle", "status-idle");
playBtn.textContent = "Play";
playBtn.disabled = true;

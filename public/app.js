// Ritcher Demo — HLS.js + Shaka Player with Ad Break Detection & Timeline
// =========================================================================

// DOM Elements
const video = document.getElementById("video");
const playBtn = document.getElementById("play-btn");
const startBtn = document.getElementById("start-btn");
const volumeSlider = document.getElementById("volume");
const formatSelect = document.getElementById("format-select");
const breaksSelect = document.getElementById("breaks-select");
const intervalSelect = document.getElementById("interval-select");
const stitcherUrlInput = document.getElementById("stitcher-url");
const originUrlInput = document.getElementById("origin-url");
const sessionIdEl = document.getElementById("session-id");
const streamStatusEl = document.getElementById("stream-status");
const currentFragEl = document.getElementById("current-frag");
const adBreakCountEl = document.getElementById("ad-break-count");
const adOverlay = document.getElementById("ad-overlay");
const adOverlayText = document.getElementById("ad-overlay-text");
const timelineContainer = document.getElementById("timeline-container");
const timelineBar = document.getElementById("timeline-bar");
const timelinePlayhead = document.getElementById("timeline-playhead");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");

// State
let hlsPlayer = null;
let shakaPlayer = null;
let currentFormat = "hls";
let adBreakCount = 0;
let isInAdBreak = false;
let totalAdBreaks = 0;
let timelineBlocks = [];
let totalDuration = 0;

// ------- Helpers -------

function generateSessionId() {
  return "demo-" + Math.random().toString(36).substring(2, 10);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function setStatus(text, className) {
  streamStatusEl.textContent = text;
  streamStatusEl.className = `info-value ${className}`;
}

function showAdOverlay(show, breakNum, totalBreaks) {
  if (show) {
    adOverlayText.textContent =
      totalBreaks > 1 ? `AD ${breakNum} of ${totalBreaks}` : "AD";
    adOverlay.classList.remove("hidden");
    setStatus("Ad Break", "status-ad");
  } else {
    adOverlay.classList.add("hidden");
    setStatus("Playing", "status-playing");
  }
}

// ------- URL Building -------

function buildPlaybackUrl() {
  const baseUrl = stitcherUrlInput.value.replace(/\/+$/, "");
  const sessionId = generateSessionId();
  const customOrigin = originUrlInput.value.trim();
  const format = formatSelect.value;
  const breaks = breaksSelect.value;
  const interval = intervalSelect.value;

  const manifestFile =
    format === "hls" ? "playlist.m3u8" : "manifest.mpd";

  let originUrl;
  if (customOrigin) {
    originUrl = customOrigin;
  } else {
    originUrl = `${baseUrl}/demo/${manifestFile}?breaks=${breaks}&interval=${interval}`;
  }

  const url = `${baseUrl}/stitch/${sessionId}/${manifestFile}?origin=${encodeURIComponent(originUrl)}`;
  return { url, sessionId, format };
}

// ------- Timeline -------

function buildTimeline(numBreaks, intervalSecs) {
  const breakDuration = 30; // DemoAdProvider: 30 segments × 1s
  const contentSegmentDuration = 10; // Mux segments are 10s each
  const segsPerInterval = Math.floor(intervalSecs / contentSegmentDuration);
  const trailingContent = 3 * contentSegmentDuration; // 30s trailing

  timelineBlocks = [];
  totalDuration = 0;

  for (let i = 0; i < numBreaks; i++) {
    // Content block before ad break
    const contentDuration = segsPerInterval * contentSegmentDuration;
    timelineBlocks.push({ type: "content", duration: contentDuration });
    totalDuration += contentDuration;

    // Ad break
    timelineBlocks.push({ type: "ad", duration: breakDuration, breakNum: i + 1 });
    totalDuration += breakDuration;
  }

  // Trailing content
  timelineBlocks.push({ type: "content", duration: trailingContent });
  totalDuration += trailingContent;

  // Render
  timelineBar.innerHTML = "";
  timelineBlocks.forEach((block) => {
    const el = document.createElement("div");
    el.className = `timeline-block timeline-${block.type}`;
    el.style.flex = `${block.duration} 0 0`;
    if (block.type === "ad") {
      el.title = `Ad Break ${block.breakNum} (${block.duration}s)`;
    } else {
      el.title = `Content (${block.duration}s)`;
    }
    timelineBar.appendChild(el);
  });

  timelineContainer.classList.remove("hidden");
  timeTotal.textContent = formatTime(totalDuration);
  timeCurrent.textContent = "0:00";
}

function updatePlayhead() {
  if (!video || !totalDuration) return;
  const currentTime = video.currentTime;
  const progress = Math.min(currentTime / totalDuration, 1);
  timelinePlayhead.style.left = `${progress * 100}%`;
  timeCurrent.textContent = formatTime(currentTime);

  // Determine which block we're in for accurate break number
  let elapsed = 0;
  for (const block of timelineBlocks) {
    elapsed += block.duration;
    if (currentTime < elapsed && block.type === "ad") {
      return block.breakNum;
    }
  }
  return null;
}

// ------- Player Cleanup -------

function destroyPlayers() {
  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }
  if (shakaPlayer) {
    shakaPlayer.destroy();
    shakaPlayer = null;
  }
  video.removeAttribute("src");
  video.load();
}

// ------- HLS.js Player -------

function loadHlsStream(url) {
  if (!Hls.isSupported()) {
    // Safari fallback
    video.src = url;
    video.addEventListener(
      "loadedmetadata",
      () => {
        setStatus("Playing", "status-playing");
        playBtn.textContent = "Pause";
        playBtn.disabled = false;
        video.play();
      },
      { once: true }
    );
    return;
  }

  hlsPlayer = new Hls({
    debug: false,
    enableWorker: true,
    lowLatencyMode: false,
  });

  hlsPlayer.loadSource(url);
  hlsPlayer.attachMedia(video);

  hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
    setStatus("Ready", "status-playing");
    playBtn.textContent = "Play";
    playBtn.disabled = false;
  });

  hlsPlayer.on(Hls.Events.FRAG_CHANGED, (_event, data) => {
    const frag = data.frag;
    currentFragEl.textContent = `#${frag.sn} (${frag.duration.toFixed(1)}s)`;

    // Detect ad break via fragment URL pattern
    const isAd = frag.url && frag.url.includes("/ad/");
    if (isAd && !isInAdBreak) {
      isInAdBreak = true;
      adBreakCount++;
      adBreakCountEl.textContent = adBreakCount;
      showAdOverlay(true, adBreakCount, totalAdBreaks);
    } else if (!isAd && isInAdBreak) {
      isInAdBreak = false;
      showAdOverlay(false);
    }
  });

  hlsPlayer.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      setStatus(`Error: ${data.type}`, "status-error");
      console.error("HLS fatal error:", data);
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setTimeout(() => hlsPlayer && hlsPlayer.startLoad(), 2000);
      }
    }
  });
}

// ------- Shaka Player (DASH) -------

async function loadDashStream(url) {
  shaka.polyfill.installAll();

  if (!shaka.Player.isBrowserSupported()) {
    setStatus("DASH not supported", "status-error");
    return;
  }

  shakaPlayer = new shaka.Player();
  await shakaPlayer.attach(video);

  shakaPlayer.addEventListener("error", (event) => {
    const error = event.detail;
    console.error("Shaka error:", error.code, error.message);
    setStatus(`Error: ${error.code}`, "status-error");
  });

  // Monitor segment requests for ad detection
  const netEngine = shakaPlayer.getNetworkingEngine();
  if (netEngine) {
    netEngine.registerResponseFilter((_type, response, context) => {
      const uri = context && context.uri ? context.uri : response.uri || "";
      const isAd = uri.includes("/ad/");

      if (isAd && !isInAdBreak) {
        isInAdBreak = true;
        adBreakCount++;
        adBreakCountEl.textContent = adBreakCount;
        showAdOverlay(true, adBreakCount, totalAdBreaks);
      } else if (!isAd && isInAdBreak && !uri.endsWith(".mpd")) {
        isInAdBreak = false;
        showAdOverlay(false);
      }

      // Update current segment display
      const segMatch = uri.match(/\/([^/]+\.(?:ts|m4s|mp4))(?:\?|$)/);
      if (segMatch) {
        currentFragEl.textContent = segMatch[1];
      }
    });
  }

  try {
    await shakaPlayer.load(url);
    setStatus("Ready", "status-playing");
    playBtn.textContent = "Play";
    playBtn.disabled = false;
  } catch (err) {
    console.error("Shaka load error:", err);
    setStatus(`Load failed`, "status-error");
  }
}

// ------- Main Load -------

function startDemo() {
  destroyPlayers();

  // Reset state
  adBreakCount = 0;
  isInAdBreak = false;
  adBreakCountEl.textContent = "0";
  currentFragEl.textContent = "—";
  showAdOverlay(false);
  setStatus("Loading...", "status-loading");
  playBtn.disabled = true;
  playBtn.textContent = "Loading...";

  const format = formatSelect.value;
  const breaks = parseInt(breaksSelect.value, 10);
  const interval = parseInt(intervalSelect.value, 10);
  totalAdBreaks = breaks;

  // Build timeline
  buildTimeline(breaks, interval);

  // Build URL & load
  const { url, sessionId } = buildPlaybackUrl();
  sessionIdEl.textContent = sessionId;

  currentFormat = format;

  if (format === "hls") {
    loadHlsStream(url);
  } else {
    loadDashStream(url);
  }
}

// ------- Event Listeners -------

startBtn.addEventListener("click", startDemo);

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

// Update playhead on time update
video.addEventListener("timeupdate", () => {
  updatePlayhead();
});

// Init — fetch config from server (supports OSC deployment)
async function init() {
  video.volume = 0.5;
  setStatus("Idle", "status-idle");
  playBtn.disabled = true;

  try {
    const resp = await fetch("/config");
    if (resp.ok) {
      const config = await resp.json();
      if (config.ritcherUrl) {
        stitcherUrlInput.value = config.ritcherUrl;
      }
    }
  } catch {
    // Fallback: keep default value from HTML
  }
}

init();

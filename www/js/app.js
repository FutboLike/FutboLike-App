import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, channelDocument } from "./firebase-config.js";

const welcomeScreen = document.querySelector("#welcomeScreen");
const playerScreen = document.querySelector("#playerScreen");
const watchButton = document.querySelector("#watchButton");
const retryButton = document.querySelector("#retryButton");
const startupStatus = document.querySelector("#startupStatus");
const video = document.querySelector("#videoPlayer");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingText = document.querySelector("#loadingText");
const errorOverlay = document.querySelector("#errorOverlay");
const errorMessage = document.querySelector("#errorMessage");
const liveBadge = document.querySelector("#liveBadge");

let hls = null;
let wakeLock = null;
let currentStreamUrl = "";
let currentConfig = null;
let userStarted = false;
let reconnectTimer = null;

function show(element) { element.classList.remove("hidden"); }
function hide(element) { element.classList.add("hidden"); }

function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "REEMPLAZAR" &&
    !firebaseConfig.projectId.includes("REEMPLAZAR");
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (error) {
    console.warn("No se pudo activar Wake Lock:", error);
  }
}

async function requestLandscape() {
  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (error) {
    console.info("La orientación será controlada por Android:", error);
  }
}

async function requestFullscreen() {
  const target = document.documentElement;
  try {
    if (!document.fullscreenElement && target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: "hide" });
    }
  } catch (error) {
    console.info("Pantalla completa administrada por Android:", error);
  }
}

function destroyPlayer() {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (hls) {
    hls.destroy();
    hls = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function playWithSound() {
  video.muted = false;
  video.volume = 1;
  try {
    await video.play();
    hide(loadingOverlay);
  } catch (error) {
    console.error("Reproducción bloqueada:", error);
    showError("Toca Reintentar para iniciar el canal con sonido.");
  }
}

function scheduleReconnect(delay = 3500) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (userStarted && currentStreamUrl) loadStream(currentStreamUrl, true);
  }, delay);
}

function showError(message) {
  hide(loadingOverlay);
  errorMessage.textContent = message;
  show(errorOverlay);
}

function attachNativeSource(url) {
  video.src = url;
  video.addEventListener("loadedmetadata", playWithSound, { once: true });
  video.addEventListener("error", () => {
    showError("La transmisión no está disponible. Intentaremos reconectar.");
    scheduleReconnect();
  }, { once: true });
}

function attachHlsSource(url) {
  hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30
  });

  hls.loadSource(url);
  hls.attachMedia(video);

  hls.on(Hls.Events.MANIFEST_PARSED, playWithSound);
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return;

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      showError("Se perdió la conexión con el canal. Reconectando…");
      hls.startLoad();
      scheduleReconnect();
      return;
    }

    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      hls.recoverMediaError();
      return;
    }

    showError("No fue posible reproducir esta señal.");
    scheduleReconnect();
  });
}

function loadStream(url, force = false) {
  if (!url) {
    showError(currentConfig?.offlineMessage || "El canal se encuentra temporalmente fuera de servicio.");
    return;
  }

  if (!force && url === currentStreamUrl && !video.paused) return;

  currentStreamUrl = url;
  destroyPlayer();
  hide(errorOverlay);
  loadingText.textContent = "Conectando con FutboLike…";
  show(loadingOverlay);

  const appearsHls = url.toLowerCase().includes(".m3u8");

  if (appearsHls && window.Hls?.isSupported()) {
    attachHlsSource(url);
  } else if (video.canPlayType("application/vnd.apple.mpegurl") || !appearsHls) {
    attachNativeSource(url);
  } else {
    showError("Este dispositivo no admite el formato de la transmisión.");
  }
}

function applyChannelConfig(data) {
  currentConfig = data;
  const online = data.online !== false;
  liveBadge.textContent = online ? "● EN VIVO" : "FUERA DE LÍNEA";

  if (!userStarted) {
    startupStatus.textContent = online ? "Canal disponible" : "Canal temporalmente fuera de servicio";
    return;
  }

  if (!online) {
    destroyPlayer();
    showError(data.offlineMessage || "El canal se encuentra temporalmente fuera de servicio.");
    return;
  }

  if (data.streamUrl && data.streamUrl !== currentStreamUrl) {
    loadStream(data.streamUrl, true);
  }
}

function connectFirebase() {
  if (!isFirebaseConfigured()) {
    startupStatus.textContent = "Falta configurar Firebase";
    console.warn("Configura www/js/firebase-config.js antes de usar la app.");
    return;
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const channelRef = doc(db, channelDocument.collection, channelDocument.id);

  onSnapshot(channelRef, (snapshot) => {
    if (!snapshot.exists()) {
      startupStatus.textContent = "Falta crear el canal en Firestore";
      if (userStarted) showError("No existe la configuración del canal en Firebase.");
      return;
    }
    applyChannelConfig(snapshot.data());
  }, (error) => {
    console.error("Error de Firebase:", error);
    startupStatus.textContent = "No se pudo conectar con Firebase";
    if (userStarted) showError("No se pudo consultar la señal del canal.");
  });
}

watchButton.addEventListener("click", async () => {
  userStarted = true;
  hide(welcomeScreen);
  show(playerScreen);

  await Promise.allSettled([
    requestFullscreen(),
    requestLandscape(),
    requestWakeLock()
  ]);

  if (currentConfig?.online === false) {
    showError(currentConfig.offlineMessage || "El canal se encuentra temporalmente fuera de servicio.");
    return;
  }

  loadStream(currentConfig?.streamUrl || "", true);
});

retryButton.addEventListener("click", async () => {
  hide(errorOverlay);
  await Promise.allSettled([requestFullscreen(), requestLandscape(), requestWakeLock()]);
  loadStream(currentStreamUrl || currentConfig?.streamUrl || "", true);
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && userStarted) {
    await requestWakeLock();
    if (video.paused && currentStreamUrl) playWithSound();
  }
});

connectFirebase();

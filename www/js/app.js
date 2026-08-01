import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, channelDocument } from "./firebase-config.js";

const welcomeScreen = document.querySelector("#welcomeScreen");
const playerScreen = document.querySelector("#playerScreen");
const watchButton = document.querySelector("#watchButton");
const watchButtonLabel = document.querySelector("#watchButtonLabel");
const retryButton = document.querySelector("#retryButton");
const startupStatus = document.querySelector("#startupStatus");
const video = document.querySelector("#videoPlayer");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingText = document.querySelector("#loadingText");
const errorOverlay = document.querySelector("#errorOverlay");
const errorMessage = document.querySelector("#errorMessage");
const liveBadge = document.querySelector("#liveBadge");
const channelName = document.querySelector("#channelName");
const welcomeMessage = document.querySelector("#welcomeMessage");
const channelLogo = document.querySelector("#channelLogo");
const fallbackLogo = document.querySelector("#fallbackLogo");
const socialSection = document.querySelector("#socialSection");
const socialMessage = document.querySelector("#socialMessage");
const instagramButton = document.querySelector("#instagramButton");
const facebookButton = document.querySelector("#facebookButton");
const accessModal = document.querySelector("#accessModal");
const accessForm = document.querySelector("#accessForm");
const accessTitle = document.querySelector("#accessTitle");
const accessPrompt = document.querySelector("#accessPrompt");
const accessCodeInput = document.querySelector("#accessCodeInput");
const accessError = document.querySelector("#accessError");
const cancelAccessButton = document.querySelector("#cancelAccessButton");

let hls = null;
let wakeLock = null;
let currentStreamUrl = "";
let currentConfig = null;
let userStarted = false;
let reconnectTimer = null;
let lastPlayerError = "";
let accessGranted = false;

const defaults = {
  channelName: "FutboLike",
  welcomeMessage: "Bienvenidos a FutboLike, búscanos en redes sociales",
  buttonText: "Ver Canal",
  offlineMessage: "El canal se encuentra temporalmente fuera de servicio.",
  liveText: "● EN VIVO",
  primaryColor: "#22c55e",
  logoUrl: "",
  backgroundUrl: "",
  socialMessage: "Síguenos en redes sociales",
  instagramUrl: "",
  facebookUrl: "",
  showInstagram: true,
  showFacebook: true,
  requireAccessCode: false,
  accessCode: "",
  accessTitle: "Canal protegido",
  accessPrompt: "Ingresa la clave para ver la transmisión."
};

function show(element) { element.classList.remove("hidden"); }
function hide(element) { element.classList.add("hidden"); }

function nativePlayer() {
  return window.Capacitor?.Plugins?.NativePlayer || null;
}

function returnToWelcome() {
  nativePlayer()?.stop().catch(() => {});
  destroyPlayer();
  userStarted = false;
  hide(playerScreen);
  hide(errorOverlay);
  hide(loadingOverlay);
  show(welcomeScreen);
  setTimeout(() => watchButton.focus(), 100);
}

async function configureBackButton() {
  const appPlugin = window.Capacitor?.Plugins?.App;
  if (!appPlugin) return;
  await appPlugin.addListener("backButton", async ({ canGoBack }) => {
    if (!accessModal.classList.contains("hidden")) {
      hide(accessModal);
      accessCodeInput.value = "";
      watchButton.focus();
      return;
    }
    if (userStarted) {
      returnToWelcome();
      return;
    }
    if (canGoBack) history.back();
    else appPlugin.exitApp();
  });
}

async function configurePushNotifications() {
  const push = window.Capacitor?.Plugins?.PushNotifications;
  const topics = window.Capacitor?.Plugins?.NotificationTopics;
  if (!push) return;

  try {
    let permission = await push.checkPermissions();
    if (permission.receive === "prompt") permission = await push.requestPermissions();
    if (permission.receive !== "granted") return;

    await push.addListener("registration", async () => {
      try { await topics?.subscribe({ topic: "futbolike" }); }
      catch (error) { console.warn("No se pudo suscribir a FutboLike:", error); }
    });
    await push.addListener("registrationError", error => {
      console.warn("No se pudo registrar el dispositivo para notificaciones:", error);
    });
    await push.addListener("pushNotificationActionPerformed", () => {
      hide(errorOverlay);
    });

    await push.register();
  } catch (error) {
    console.warn("Las notificaciones no están disponibles:", error);
  }
}

nativePlayer()?.addListener("playerError", event => {
  lastPlayerError = `libVLC: ${event?.message || "error desconocido"}`;
  showError("La transmisión se interrumpió. Intentaremos reconectar.");
  scheduleReconnect();
});

function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "REEMPLAZAR" && !firebaseConfig.projectId.includes("REEMPLAZAR");
}

function safeWebUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = new URL(value);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = new URL(value);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function applyVisualConfig(data = {}) {
  const config = { ...defaults, ...data };
  const logoUrl = safeImageUrl(config.logoUrl);
  const backgroundUrl = safeImageUrl(config.backgroundUrl);
  const instagramUrl = safeWebUrl(config.instagramUrl);
  const facebookUrl = safeWebUrl(config.facebookUrl);

  channelName.textContent = config.channelName;
  welcomeMessage.textContent = config.welcomeMessage;
  watchButtonLabel.textContent = config.buttonText;
  loadingText.textContent = `Conectando con ${config.channelName}…`;
  document.title = `${config.channelName} TV`;
  document.documentElement.style.setProperty("--primary-color", config.primaryColor || defaults.primaryColor);
  document.documentElement.style.setProperty("--welcome-background", backgroundUrl ? `url("${backgroundUrl.replaceAll('"', '%22')}")` : "none");

  socialMessage.textContent = config.socialMessage || defaults.socialMessage;
  accessTitle.textContent = config.accessTitle || defaults.accessTitle;
  accessPrompt.textContent = config.accessPrompt || defaults.accessPrompt;
  const showInstagram = config.showInstagram !== false && Boolean(instagramUrl);
  const showFacebook = config.showFacebook !== false && Boolean(facebookUrl);

  if (showInstagram) {
    instagramButton.href = instagramUrl;
    show(instagramButton);
  } else {
    instagramButton.removeAttribute("href");
    hide(instagramButton);
  }

  if (showFacebook) {
    facebookButton.href = facebookUrl;
    show(facebookButton);
  } else {
    facebookButton.removeAttribute("href");
    hide(facebookButton);
  }

  if (showInstagram || showFacebook) show(socialSection);
  else hide(socialSection);

  if (logoUrl) {
    channelLogo.src = logoUrl;
    channelLogo.onload = () => { show(channelLogo); hide(fallbackLogo); };
    channelLogo.onerror = () => { hide(channelLogo); show(fallbackLogo); };
  } else {
    channelLogo.removeAttribute("src");
    hide(channelLogo);
    show(fallbackLogo);
  }
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request("screen"); }
  catch (error) { console.warn("No se pudo activar Wake Lock:", error); }
}

async function requestLandscape() {
  try { if (screen.orientation?.lock) await screen.orientation.lock("landscape"); }
  catch (error) { console.info("La orientación será controlada por Android:", error); }
}

async function requestFullscreen() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }
  } catch (error) { console.info("Pantalla completa administrada por Android:", error); }
}

function destroyPlayer() {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (hls) { hls.destroy(); hls = null; }
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function attachLibVLCSource(url) {
  lastPlayerError = "";
  try {
    await nativePlayer().play({
      url,
      streamType: currentConfig?.streamType || (url.toLowerCase().includes(".m3u8") ? "m3u8" : "")
    });
    hide(loadingOverlay);
  } catch (error) {
    lastPlayerError = error?.message || String(error);
    showError("libVLC no pudo iniciar la transmisión.");
  }
}

async function playWithSound() {
  video.muted = false;
  video.volume = 1;
  try { await video.play(); hide(loadingOverlay); }
  catch (error) { console.error(error); showError("Toca Reintentar para iniciar el canal con sonido."); }
}

function scheduleReconnect(delay = 3500) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (userStarted && currentStreamUrl) loadStream(currentStreamUrl, true);
  }, delay);
}

function showError(message) {
  hide(loadingOverlay);
  errorMessage.textContent = lastPlayerError ? `${message}

Detalle: ${lastPlayerError}` : message;
  show(errorOverlay);
}

function attachNativeSource(url) {
  lastPlayerError = "";
  video.src = url;
  video.addEventListener("loadedmetadata", playWithSound, { once: true });
  video.addEventListener("error", () => {
    const code = video.error?.code || "desconocido";
    lastPlayerError = `Error nativo ${code}. El enlace puede ser incompatible, estar bloqueado o requerir encabezados especiales.`;
    showError("La transmisión no está disponible. Intentaremos reconectar.");
    scheduleReconnect();
  }, { once: true });
}

function attachHlsSource(url) {
  lastPlayerError = "";
  hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    manifestLoadingTimeOut: 15000,
    levelLoadingTimeOut: 15000,
    fragLoadingTimeOut: 20000
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, playWithSound);
  hls.on(Hls.Events.ERROR, (_event, data) => {
    lastPlayerError = `${data.type || "error"}: ${data.details || "sin detalle"}${data.response?.code ? ` (HTTP ${data.response.code})` : ""}`;
    console.error("HLS error:", data);
    if (!data.fatal) return;
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      showError("Se perdió la conexión con el canal. Reconectando…");
      hls.startLoad(); scheduleReconnect(); return;
    }
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; }
    showError("No fue posible reproducir esta señal."); scheduleReconnect();
  });
}

function loadStream(url, force = false) {
  lastPlayerError = "";
  url = typeof url === "string" ? url.trim() : "";
  if (!url) { showError(currentConfig?.offlineMessage || defaults.offlineMessage); return; }
  if (!force && url === currentStreamUrl && !video.paused) return;
  currentStreamUrl = url;
  destroyPlayer();
  hide(errorOverlay); show(loadingOverlay);
  if (nativePlayer()) {
    attachLibVLCSource(url);
    return;
  }
  const appearsHls = url.toLowerCase().includes(".m3u8");
  if (appearsHls && window.Hls?.isSupported()) attachHlsSource(url);
  else if (video.canPlayType("application/vnd.apple.mpegurl") || !appearsHls) attachNativeSource(url);
  else showError("Este dispositivo no admite el formato de la transmisión.");
}

function applyChannelConfig(data) {
  const previousAccessCode = currentConfig?.accessCode;
  currentConfig = { ...defaults, ...data };
  if (previousAccessCode !== undefined && previousAccessCode !== currentConfig.accessCode) accessGranted = false;
  applyVisualConfig(currentConfig);
  const online = currentConfig.online !== false;
  liveBadge.textContent = online ? currentConfig.liveText : "FUERA DE LÍNEA";
  startupStatus.textContent = online ? "Canal disponible" : "Canal temporalmente fuera de servicio";

  if (!userStarted) {
    setTimeout(() => watchButton.focus(), 100);
    return;
  }
  if (!online) {
    destroyPlayer();
    nativePlayer()?.stop().catch(() => {});
    showError(currentConfig.offlineMessage);
    return;
  }
  if (currentConfig.streamUrl && currentConfig.streamUrl !== currentStreamUrl) loadStream(currentConfig.streamUrl, true);
}

function connectFirebase() {
  applyVisualConfig(defaults);
  if (!isFirebaseConfigured()) { startupStatus.textContent = "Falta configurar Firebase"; return; }
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const channelRef = doc(db, channelDocument.collection, channelDocument.id);
  onSnapshot(channelRef, snapshot => {
    if (!snapshot.exists()) {
      startupStatus.textContent = "Falta crear el canal en Firestore";
      if (userStarted) showError("No existe la configuración del canal en Firebase.");
      return;
    }
    applyChannelConfig(snapshot.data());
  }, error => {
    console.error("Error de Firebase:", error);
    startupStatus.textContent = "No se pudo conectar con Firebase";
    if (userStarted) showError("No se pudo consultar la señal del canal.");
  });
}

async function startChannel() {
  userStarted = true; hide(welcomeScreen); show(playerScreen);
  await Promise.allSettled([requestFullscreen(), requestLandscape(), requestWakeLock()]);
  if (currentConfig?.online === false) { showError(currentConfig.offlineMessage); return; }
  loadStream(currentConfig?.streamUrl || "", true);
}

watchButton.addEventListener("click", () => {
  const requiresCode = currentConfig?.requireAccessCode === true && String(currentConfig?.accessCode || "").length > 0;
  if (!requiresCode || accessGranted) {
    startChannel();
    return;
  }
  accessCodeInput.value = "";
  hide(accessError);
  show(accessModal);
  setTimeout(() => accessCodeInput.focus(), 120);
});

accessForm.addEventListener("submit", event => {
  event.preventDefault();
  if (accessCodeInput.value === String(currentConfig?.accessCode || "")) {
    accessGranted = true;
    hide(accessModal);
    startChannel();
    return;
  }
  show(accessError);
  accessCodeInput.select();
});

cancelAccessButton.addEventListener("click", () => {
  hide(accessModal);
  accessCodeInput.value = "";
});

retryButton.addEventListener("click", async () => {
  hide(errorOverlay);
  await Promise.allSettled([requestFullscreen(), requestLandscape(), requestWakeLock()]);
  loadStream(currentStreamUrl || currentConfig?.streamUrl || "", true);
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && userStarted) {
    await requestWakeLock();
    if (!nativePlayer() && video.paused && currentStreamUrl) playWithSound();
  }
});

connectFirebase();
configurePushNotifications();
configureBackButton();

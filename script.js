const gameArea = document.getElementById("game-area");
const scoreDisplay = document.getElementById("score");
const comboDisplay = document.getElementById("combo");
const timerDisplay = document.getElementById("timer");
const livesIconsDisplay = document.getElementById("lives-icons");
const pauseButton = document.getElementById("btn-pause");
const muteButton = document.getElementById("btn-mute");
const instructionsButton = document.getElementById("btn-instructions");
const instructionsContent = document.getElementById("instructions-content");
const instructionsPanel = document.getElementById("instructions");
const helpModeButtons = document.querySelectorAll(".mode-help-btn");
const helpModal = document.getElementById("help-modal");
const helpModalTitle = document.getElementById("help-modal-title");
const helpModalContent = document.getElementById("help-modal-content");
const helpModalClose = document.getElementById("help-modal-close");
const lifeModal = document.getElementById("life-modal");
const lifeModalText = document.getElementById("life-modal-text");
const lifeModalResume = document.getElementById("life-modal-resume");

const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audio = AudioCtx ? new AudioCtx() : null;

const BASE_MUSIC_VOLUME = 0.15;
const OBJECT_LIFETIME_MS = 2000;
const COMBO_STEP = 3;
const MAX_COMBO_MULTIPLIER = 5;
const DEFAULT_LIVES = 3;
const STORAGE_MUTE_KEY = "putaclic_muted";
const MODAL_TRANSITION_MS = 220;

const music = new Audio("assets/heroic-age.mp3");
music.loop = true;
music.volume = BASE_MUSIC_VOLUME;

let score = 0;
let lives = DEFAULT_LIVES;
let maxLives = DEFAULT_LIVES;
let comboStreak = 0;
let comboMultiplier = 1;
let timeLeft = 0;
let difficulty = "";
let timerInterval = null;
let spawnInterval = null;
let isGameActive = false;
let isPaused = false;
let isMuted = getStoredBool(STORAGE_MUTE_KEY, false);
let helpModalCloseTimer = null;

const activeObjects = new Map();

const types = [
  { img: "assets/egg.png", points: 1 },
  { img: "assets/egg.png", points: 1 },
  { img: "assets/egg.png", points: 1 },
  { img: "assets/golden-egg.png", points: 5 },
  { img: "assets/poule.png", points: -2 },
];

const settings = {
  easy: { duration: 60, spawnRate: 1200, lives: 5 },
  medium: { duration: 45, spawnRate: 800, lives: 4 },
  hard: { duration: 30, spawnRate: 500, lives: 3 },
};

const HELP_BY_MODE = {
  easy: {
    title: "Petit poussin",
    sections: [
      {
        heading: "Comment ca marche",
        items: [
          "Partie de 60 secondes avec un rythme plus calme.",
          "Tu commences avec 5 vies (boucliers).",
          "Chaque vie perdue met la partie en pause: appuie sur Reprendre.",
          "Les objets apparaissent moins vite pour t'habituer.",
          "Tu dois cliquer chaque bon objet avant sa disparition.",
        ],
      },
      {
        heading: "Comment gagner des points",
        items: [
          "Oeuf chocolat: +1 x combo.",
          "Oeuf dore: +5 x combo.",
          "Le combo monte tous les 3 bons clics (jusqu'a x5).",
        ],
      },
      {
        heading: "A ne pas faire",
        items: [
          "Ne clique pas sur la poule: -2 points et combo remis a x1.",
          "Ne clique pas dans le vide: tu perds 1 vie.",
          "Ne laisse pas un oeuf positif disparaitre: tu perds 1 vie.",
        ],
      },
    ],
  },
  medium: {
    title: "Lapin malin",
    sections: [
      {
        heading: "Comment ca marche",
        items: [
          "Partie de 45 secondes avec un rythme nerveux.",
          "Tu commences avec 4 vies (boucliers).",
          "Chaque vie perdue met la partie en pause: appuie sur Reprendre.",
          "Le temps de reaction devient plus court.",
          "Garde un rythme regulier pour maintenir le combo.",
        ],
      },
      {
        heading: "Comment gagner des points",
        items: [
          "Oeuf chocolat: +1 x combo.",
          "Oeuf dore: +5 x combo, priorite absolue.",
          "Une serie propre augmente vite ton multiplicateur.",
        ],
      },
      {
        heading: "A ne pas faire",
        items: [
          "Ne poursuis pas une poule au milieu d'un paquet d'oeufs.",
          "Ne panique pas et ne clique pas dans le decor: -1 vie.",
          "Ne casse pas ta serie de bons clics inutilement.",
        ],
      },
    ],
  },
  hard: {
    title: "Chasseur d'oeufs",
    sections: [
      {
        heading: "Comment ca marche",
        items: [
          "Partie de 30 secondes, tres rapide.",
          "Tu commences avec 3 vies (boucliers).",
          "Chaque vie perdue met la partie en pause: appuie sur Reprendre.",
          "Les apparitions s'enchainent presque sans pause.",
          "Il faut cliquer juste, vite et sans erreur.",
        ],
      },
      {
        heading: "Comment gagner des points",
        items: [
          "Le combo est la cle: vise x3-x5 le plus vite possible.",
          "Les oeufs dores font la difference sur ce mode.",
          "Reste au centre de l'ecran pour couvrir toute la zone.",
        ],
      },
      {
        heading: "A ne pas faire",
        items: [
          "Un clic dans le vide = -1 vie.",
          "Une disparition d'oeuf positif = -1 vie.",
          "Un clic poule au mauvais moment peut ruiner ton record.",
        ],
      },
    ],
  },
};

function getStoredBool(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "1";
  } catch {
    return fallback;
  }
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode / quota issues)
  }
}

function playNote(freq, duration, type = "sine", vol = 0.12, delay = 0) {
  if (!audio || isMuted) return;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.linearRampToValueAtTime(0, t + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function playNoise(duration, vol = 0.15, delay = 0) {
  if (!audio || isMuted) return;
  const t = audio.currentTime + delay;
  const frameCount = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buf = audio.createBuffer(1, frameCount, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  src.buffer = buf;
  const gain = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 3000;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.linearRampToValueAtTime(0, t + duration);
  src.connect(filter).connect(gain).connect(audio.destination);
  src.start(t);
}

function playCollect() {
  playNoise(0.08, 0.18);
  playNote(800, 0.06, "sawtooth", 0.1);
  playNote(1200, 0.04, "sawtooth", 0.06, 0.02);
}

function playGolden() {
  playNoise(0.12, 0.2);
  playNote(600, 0.08, "sawtooth", 0.12);
  playNote(900, 0.06, "sawtooth", 0.1, 0.03);
  playNote(1400, 0.1, "sawtooth", 0.08, 0.06);
  playNote(200, 0.3, "triangle", 0.06, 0.1);
}

function playMalus() {
  playNote(150, 0.15, "sawtooth", 0.15);
  playNote(80, 0.4, "square", 0.12, 0.05);
  playNoise(0.1, 0.1, 0.02);
}

function playGameOver() {
  playNote(250, 0.3, "sawtooth", 0.12);
  playNote(180, 0.4, "sawtooth", 0.1, 0.2);
  playNote(100, 0.6, "square", 0.08, 0.5);
  playNoise(0.15, 0.08);
}

function ensureAudioReady() {
  if (!audio || audio.state !== "suspended") return;
  audio.resume().catch(() => {
    // If blocked, game still runs silently.
  });
}

function startMusic(resetTime = false) {
  if (isMuted) return;
  if (resetTime) music.currentTime = 3;
  const playPromise = music.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // Ignore autoplay blocking; sound can be retried on next interaction.
    });
  }
}

function stopMusic() {
  music.pause();
}

function updateMuteUI() {
  muteButton.textContent = isMuted ? "Son : OFF" : "Son : ON";
}

function applyMuteState() {
  music.volume = isMuted ? 0 : BASE_MUSIC_VOLUME;
  setStoredValue(STORAGE_MUTE_KEY, isMuted ? "1" : "0");
  updateMuteUI();

  if (isMuted) {
    stopMusic();
    return;
  }

  if (isGameActive && !isPaused) {
    ensureAudioReady();
    startMusic(false);
  }
}

function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((screen) => screen.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function updateScore() {
  scoreDisplay.textContent = score;
}

function updateTimer() {
  timerDisplay.textContent = timeLeft;
}

function getLivesLabel(count) {
  return count > 1 ? "vies" : "vie";
}

function updateLives() {
  if (!livesIconsDisplay) return;

  livesIconsDisplay.innerHTML = "";
  for (let i = 0; i < maxLives; i++) {
    const icon = document.createElement("span");
    icon.className = "life-icon";
    if (i >= lives) icon.classList.add("is-lost");
    icon.setAttribute("aria-hidden", "true");
    livesIconsDisplay.appendChild(icon);
  }

  const suffix = lives > 1 ? "restantes" : "restante";
  livesIconsDisplay.setAttribute(
    "aria-label",
    lives + " " + getLivesLabel(lives) + " " + suffix
  );
}

function isLifeModalOpen() {
  return !!lifeModal && lifeModal.classList.contains("is-open");
}

function hideLifeModal() {
  if (lifeModal) lifeModal.classList.remove("is-open");
}

function showLifeModal() {
  if (!lifeModal || !lifeModalText) return;

  const suffix = lives > 1 ? "restantes" : "restante";
  lifeModalText.textContent =
    "Vie perdue ! Il te reste " +
    lives +
    " " +
    getLivesLabel(lives) +
    " " +
    suffix +
    ".";

  lifeModal.classList.add("is-open");
  if (lifeModalResume) lifeModalResume.focus();
}

function resumeAfterLifeLoss() {
  if (!isGameActive || !isLifeModalOpen()) return;

  hideLifeModal();
  if (isPaused) togglePause();
}

function updateComboDisplay() {
  comboDisplay.textContent = "x" + comboMultiplier;
  comboDisplay.classList.toggle("combo-active", comboMultiplier > 1);
}

function resetCombo() {
  comboStreak = 0;
  comboMultiplier = 1;
  updateComboDisplay();
}

function getComboMultiplier(streak) {
  return Math.min(1 + Math.floor(streak / COMBO_STEP), MAX_COMBO_MULTIPLIER);
}

function setPauseUI() {
  pauseButton.disabled = !isGameActive;
  pauseButton.textContent = isPaused ? "Reprendre" : "Pause";
}

function clearLoops() {
  clearInterval(timerInterval);
  clearInterval(spawnInterval);
  timerInterval = null;
  spawnInterval = null;
}

function clearActiveObjects() {
  activeObjects.forEach((state) => {
    clearTimeout(state.timeoutId);
    state.el.remove();
  });
  activeObjects.clear();
}

function resetRun() {
  clearLoops();
  gameArea.removeEventListener("click", onMissClick);
  clearActiveObjects();
  gameArea.classList.remove("paused");
}

function startTimerLoop() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateTimer();
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function startSpawnLoop() {
  clearInterval(spawnInterval);
  spawnInterval = setInterval(() => {
    spawnObject();
  }, settings[difficulty].spawnRate);
}

function startGame(key) {
  if (!settings[key]) return;

  resetRun();
  closeInstructionsMenu();
  closeHelpModal(true);
  hideLifeModal();

  difficulty = key;
  score = 0;
  maxLives = settings[key].lives || DEFAULT_LIVES;
  lives = maxLives;
  timeLeft = settings[key].duration;
  isGameActive = true;
  isPaused = false;

  gameArea.innerHTML = "";
  updateScore();
  updateTimer();
  updateLives();
  resetCombo();

  showScreen("screen-game");
  setPauseUI();

  startTimerLoop();
  startSpawnLoop();
  gameArea.addEventListener("click", onMissClick);

  ensureAudioReady();
  startMusic(true);
}

function onMissClick(e) {
  if (!isGameActive || isPaused) return;
  if (e.target === gameArea) loseLife();
}

function loseLife() {
  if (!isGameActive || isPaused) return;

  lives = Math.max(0, lives - 1);
  updateLives();
  resetCombo();

  clearActiveObjects();
  flashRed();
  playMalus();

  if (lives <= 0) {
    hideLifeModal();
    endGame();
    return;
  }

  if (!isPaused) togglePause();
  showLifeModal();
}

function getBestScore(key) {
  try {
    const raw = localStorage.getItem("best_" + key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function endGame() {
  if (!isGameActive) return;

  isGameActive = false;
  isPaused = false;
  resetRun();
  hideLifeModal();

  document.getElementById("final-score").textContent = score;

  const best = getBestScore(difficulty);
  const isNewRecord = score > best;
  document.getElementById("new-record").style.display = isNewRecord
    ? "block"
    : "none";
  if (isNewRecord) {
    setStoredValue("best_" + difficulty, String(score));
  }

  stopMusic();
  playGameOver();
  loadHighScores();
  setPauseUI();
  showScreen("screen-gameover");
}

function togglePause() {
  if (!isGameActive) return;

  isPaused = !isPaused;

  if (isPaused) {
    clearLoops();
    gameArea.removeEventListener("click", onMissClick);
    activeObjects.forEach((state) => {
      clearTimeout(state.timeoutId);
      state.remainingMs = Math.max(80, state.expiresAt - Date.now());
      state.timeoutId = null;
    });
    gameArea.classList.add("paused");
    stopMusic();
  } else {
    startTimerLoop();
    startSpawnLoop();
    gameArea.addEventListener("click", onMissClick);
    activeObjects.forEach((state) => {
      scheduleObjectExpiry(state, state.remainingMs || OBJECT_LIFETIME_MS);
    });
    gameArea.classList.remove("paused");
    ensureAudioReady();
    startMusic(false);
  }

  setPauseUI();
}

function goToMenu() {
  if (isGameActive) {
    isGameActive = false;
    isPaused = false;
    resetRun();
    stopMusic();
  }

  setPauseUI();
  hideLifeModal();
  closeHelpModal(true);
  closeInstructionsMenu();
  showScreen("screen-menu");
}

function scheduleObjectExpiry(state, delayMs) {
  state.expiresAt = Date.now() + delayMs;
  state.timeoutId = setTimeout(() => {
    expireObject(state);
  }, delayMs);
}

function expireObject(state) {
  if (!activeObjects.has(state.el)) return;

  activeObjects.delete(state.el);
  state.el.remove();

  if (state.type.points > 0 && isGameActive && !isPaused) {
    loseLife();
  }
}

function spawnParticles(cx, cy, points) {
  const count = points >= 5 ? 20 : points < 0 ? 8 : 12;
  const color = points >= 5 ? "#ffd700" : points < 0 ? "#ff3333" : "#d4943a";

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = cx + "px";
    particle.style.top = cy + "px";
    particle.style.background = color;

    const angle = (Math.PI * 2 * i) / count;
    const dist = 60 + Math.random() * 100;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    particle.style.setProperty("--dx", dx + "px");
    particle.style.setProperty("--dy", dy + "px");

    if (points >= 5) particle.style.boxShadow = "0 0 8px " + color;

    document.body.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove());
  }
}

function showFloatingScore(cx, cy, points) {
  const txt = document.createElement("div");
  txt.className = "floating-score";
  txt.textContent = points > 0 ? "+" + points : String(points);

  if (points >= 5) txt.classList.add("golden");
  if (points < 0) txt.classList.add("negative");

  txt.style.left = cx + "px";
  txt.style.top = cy + "px";

  document.body.appendChild(txt);
  txt.addEventListener("animationend", () => txt.remove());
}

function flashRed() {
  const overlay = document.createElement("div");
  overlay.className = "red-flash";
  gameArea.appendChild(overlay);
  overlay.addEventListener("animationend", () => overlay.remove());
}

function collectObject(state, event) {
  if (!activeObjects.has(state.el)) return;

  event.stopPropagation();

  clearTimeout(state.timeoutId);
  activeObjects.delete(state.el);

  let pointsDelta = state.type.points;

  if (state.type.points > 0) {
    comboStreak += 1;
    comboMultiplier = getComboMultiplier(comboStreak);
    pointsDelta = state.type.points * comboMultiplier;
  } else {
    resetCombo();
  }

  score = Math.max(0, score + pointsDelta);
  updateScore();
  updateComboDisplay();

  if (state.type.points === 5) playGolden();
  else if (state.type.points < 0) playMalus();
  else playCollect();

  const rect = state.el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  spawnParticles(cx, cy, pointsDelta);
  showFloatingScore(cx, cy, pointsDelta);

  if (state.type.points < 0) flashRed();

  state.el.remove();
}

function spawnObject() {
  if (!isGameActive || isPaused) return;

  const type = types[Math.floor(Math.random() * types.length)];
  const el = document.createElement("img");
  el.classList.add("game-object");
  el.src = type.img;
  el.alt = "objet de jeu";
  el.draggable = false;

  el.style.top = Math.random() * 60 + 10 + "%";
  el.style.left = Math.random() * 60 + 15 + "%";

  const state = {
    el,
    type,
    timeoutId: null,
    expiresAt: 0,
    remainingMs: OBJECT_LIFETIME_MS,
  };

  el.addEventListener("click", (event) => {
    if (!isGameActive || isPaused) return;
    collectObject(state, event);
  });

  activeObjects.set(el, state);
  gameArea.appendChild(el);
  scheduleObjectExpiry(state, OBJECT_LIFETIME_MS);
}

function loadHighScores() {
  ["easy", "medium", "hard"].forEach((key) => {
    document.getElementById("high-" + key).textContent = getBestScore(key);
  });
}

function closeInstructionsMenu() {
  instructionsButton.setAttribute("aria-expanded", "false");
  instructionsContent.hidden = true;
  instructionsPanel.classList.remove("open");
}

function toggleInstructions() {
  const isOpen = instructionsButton.getAttribute("aria-expanded") === "true";

  if (isOpen) {
    closeInstructionsMenu();
    return;
  }

  instructionsButton.setAttribute("aria-expanded", "true");
  instructionsContent.hidden = false;
  instructionsPanel.classList.add("open");
}

function renderHelpModal(modeKey) {
  const data = HELP_BY_MODE[modeKey];
  if (!data) return false;

  helpModalTitle.textContent = data.title;
  helpModalContent.innerHTML = "";

  data.sections.forEach((sectionData) => {
    const section = document.createElement("section");
    section.className = "help-section";

    const heading = document.createElement("h3");
    heading.textContent = sectionData.heading;
    section.appendChild(heading);

    const list = document.createElement("ul");
    sectionData.items.forEach((itemText) => {
      const item = document.createElement("li");
      item.textContent = itemText;
      list.appendChild(item);
    });

    section.appendChild(list);
    helpModalContent.appendChild(section);
  });

  return true;
}

function openHelpModal(modeKey) {
  if (!renderHelpModal(modeKey)) return;

  if (helpModalCloseTimer) {
    clearTimeout(helpModalCloseTimer);
    helpModalCloseTimer = null;
  }

  helpModal.hidden = false;
  helpModal.classList.remove("is-closing");

  requestAnimationFrame(() => {
    helpModal.classList.add("is-open");
  });

  document.body.classList.add("modal-open");
}

function closeHelpModal(immediate = false) {
  if (helpModalCloseTimer) {
    clearTimeout(helpModalCloseTimer);
    helpModalCloseTimer = null;
  }

  if (helpModal.hidden) {
    document.body.classList.remove("modal-open");
    helpModal.classList.remove("is-open", "is-closing");
    if (immediate && helpModalContent) helpModalContent.innerHTML = "";
    return;
  }

  if (immediate) {
    helpModal.classList.remove("is-open", "is-closing");
    helpModal.hidden = true;
    if (helpModalContent) helpModalContent.innerHTML = "";
    document.body.classList.remove("modal-open");
    return;
  }

  helpModal.classList.remove("is-open");
  helpModal.classList.add("is-closing");

  helpModalCloseTimer = setTimeout(() => {
    helpModal.hidden = true;
    helpModal.classList.remove("is-closing");
    if (helpModalContent) helpModalContent.innerHTML = "";
    document.body.classList.remove("modal-open");
    helpModalCloseTimer = null;
  }, MODAL_TRANSITION_MS);
}

document.querySelectorAll(".menu-buttons button").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.difficulty));
});

document
  .getElementById("btn-replay")
  .addEventListener("click", () => startGame(difficulty));
document.getElementById("btn-menu").addEventListener("click", goToMenu);
pauseButton.addEventListener("click", togglePause);
muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  applyMuteState();
});
instructionsButton.addEventListener("click", toggleInstructions);

helpModeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    openHelpModal(btn.dataset.modeHelp);
    closeInstructionsMenu();
  });
});

helpModalClose.addEventListener("click", () => closeHelpModal());
helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) closeHelpModal();
});

if (lifeModalResume) {
  lifeModalResume.addEventListener("click", resumeAfterLifeLoss);
}

if (lifeModal) {
  lifeModal.addEventListener("click", (event) => {
    if (event.target === lifeModal) resumeAfterLifeLoss();
  });
}

document.addEventListener("keydown", (event) => {
  if (isLifeModalOpen() && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    resumeAfterLifeLoss();
    return;
  }

  if (event.key !== "Escape") return;

  if (isLifeModalOpen()) {
    resumeAfterLifeLoss();
    return;
  }

  if (!helpModal.hidden) {
    closeHelpModal();
    return;
  }

  if (!instructionsContent.hidden) {
    closeInstructionsMenu();
  }
});

document.addEventListener("click", (event) => {
  if (instructionsContent.hidden) return;
  if (instructionsPanel.contains(event.target)) return;
  closeInstructionsMenu();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && isGameActive && !isPaused) {
    togglePause();
  }
});

updateMuteUI();
applyMuteState();
setPauseUI();
updateLives();
loadHighScores();

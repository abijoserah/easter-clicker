const gameArea = document.getElementById("game-area");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");

const audio = new AudioContext();

function playSound(freq, duration, type = "sine") {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
}

let musicInterval = null;

function startMusic() {
    const melody = [392, 440, 494, 523, 587, 523, 494, 440, 392, 330, 349, 392, 440, 392, 349, 330];
    let i = 0;
    musicInterval = setInterval(() => {
        const note = melody[i % melody.length];

        const osc1 = audio.createOscillator();
        const gain1 = audio.createGain();
        osc1.type = "sine";
        osc1.frequency.value = note;
        gain1.gain.value = 0.03;
        gain1.gain.linearRampToValueAtTime(0, audio.currentTime + 0.4);
        osc1.connect(gain1).connect(audio.destination);
        osc1.start();
        osc1.stop(audio.currentTime + 0.4);

        if (i % 4 === 0) {
            const osc2 = audio.createOscillator();
            const gain2 = audio.createGain();
            osc2.type = "triangle";
            osc2.frequency.value = note / 2;
            gain2.gain.value = 0.02;
            gain2.gain.linearRampToValueAtTime(0, audio.currentTime + 0.8);
            osc2.connect(gain2).connect(audio.destination);
            osc2.start();
            osc2.stop(audio.currentTime + 0.8);
        }
        i++;
    }, 300);
}

function stopMusic() {
    clearInterval(musicInterval);
}

let score = 0;
let timeLeft = 0;
let difficulty = "";
let timerInterval, spawnInterval;

const types = [
    { img: "images/chocolate-egg.png", points: 1 },
    { img: "images/chocolate-egg.png", points: 1 },
    { img: "images/chocolate-egg.png", points: 1 },
    { img: "images/golden-egg.png", points: 5 },
    { img: "images/poule.png", points: -2 }
];

const settings = {
    easy: { duration: 60, spawnRate: 1200 },
    medium: { duration: 45, spawnRate: 800 },
    hard: { duration: 30, spawnRate: 500 }
};

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function startGame(key) {
    score = 0;
    difficulty = key;
    timeLeft = settings[key].duration;
    scoreDisplay.textContent = score;
    timerDisplay.textContent = timeLeft;
    gameArea.innerHTML = "";
    showScreen("screen-game");

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);

    spawnInterval = setInterval(spawnObject, settings[key].spawnRate);
    gameArea.addEventListener("click", onMissClick);
    startMusic();
}

function onMissClick(e) {
    if (e.target === gameArea) endGame();
}

function endGame() {
    clearInterval(timerInterval);
    clearInterval(spawnInterval);
    gameArea.removeEventListener("click", onMissClick);
    gameArea.innerHTML = "";
    document.getElementById("final-score").textContent = score;

    const best = localStorage.getItem("best_" + difficulty) || 0;
    document.getElementById("new-record").style.display = score > best ? "block" : "none";
    if (score > best) localStorage.setItem("best_" + difficulty, score);

    stopMusic();
    playSound(300, 0.2); playSound(200, 0.3);
    loadHighScores();
    showScreen("screen-gameover");
}

function spawnObject() {
    const type = types[Math.floor(Math.random() * types.length)];
    const el = document.createElement("img");
    el.classList.add("game-object");
    el.src = type.img;
    el.style.top = Math.random() * 80 + 5 + "%";
    el.style.left = Math.random() * 80 + 5 + "%";
    el.addEventListener("click", () => {
        score = Math.max(0, score + type.points);
        scoreDisplay.textContent = score;
        if (type.points === 5) { playSound(800, 0.15); playSound(1200, 0.15); }
        else if (type.points < 0) playSound(200, 0.3, "sawtooth");
        else playSound(600, 0.1);
        el.remove();
    });
    gameArea.appendChild(el);
    setTimeout(() => {
        if (el.parentNode) {
            el.remove();
            if (type.points > 0) endGame();
        }
    }, 2000);
}

function loadHighScores() {
    ["easy", "medium", "hard"].forEach(k => {
        document.getElementById("high-" + k).textContent = localStorage.getItem("best_" + k) || 0;
    });
}

document.querySelectorAll(".menu-buttons button").forEach(btn => {
    btn.addEventListener("click", () => startGame(btn.dataset.difficulty));
});
document.getElementById("btn-replay").addEventListener("click", () => startGame(difficulty));
document.getElementById("btn-menu").addEventListener("click", () => showScreen("screen-menu"));

loadHighScores();

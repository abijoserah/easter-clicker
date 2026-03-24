const screenMenu = document.getElementById("screen-menu");
const screenGame = document.getElementById("screen-game");
const screenGameover = document.getElementById("screen-gameover");

function showScreen(screenId) {
    screenMenu.classList.remove("active");
    screenGame.classList.remove("active");
    screenGameover.classList.remove("active");
    document.getElementById(screenId).classList.add("active");
}

const difficultyButtons = document.querySelectorAll(".menu-buttons button");
for (let i = 0; i < difficultyButtons.length; i++) {
    difficultyButtons[i].addEventListener("click", function () {
        showScreen("screen-game");
    });
}
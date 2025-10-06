// ==============================
// Deadlock Master - app.js (Fixed)
// ==============================

// Global game state
const gameState = {
  currentLevel: 1,
  score: 0,
  time: 0,
  timer: null,
  matrices: {
    max: [],
    allocation: [],
    need: [],
    available: []
  }
};

// Levels data (example)
const levels = {
  1: {
    processes: 2,
    resources: 3,
    maxMatrix: [[7, 5, 3], [3, 2, 2]],
    allocationMatrix: [[0, 1, 0], [2, 0, 0]],
    availableResources: [3, 3, 2]
  },
  2: {
    processes: 3,
    resources: 3,
    maxMatrix: [[7, 5, 3], [3, 2, 2], [9, 0, 2]],
    allocationMatrix: [[0, 1, 0], [2, 0, 0], [3, 0, 2]],
    availableResources: [3, 3, 2]
  }
};

// ==============================
// Core Banker’s Algorithm Functions
// ==============================

function calculateNeedMatrix(max, allocation) {
  return max.map((row, i) => row.map((val, j) => val - allocation[i][j]));
}

function isSafeState(allocation, need, available) {
  const n = allocation.length;
  const m = available.length;
  const work = [...available];
  const finish = Array(n).fill(false);

  let safeSequence = [];

  while (safeSequence.length < n) {
    let found = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        if (need[i].every((val, j) => val <= work[j])) {
          for (let j = 0; j < m; j++) {
            work[j] += allocation[i][j];
          }
          safeSequence.push(i);
          finish[i] = true;
          found = true;
        }
      }
    }
    if (!found) break;
  }

  return safeSequence.length === n;
}

// ==============================
// Game Flow Functions
// ==============================

function loadLevel(levelNum) {
  const level = levels[levelNum];
  if (!level) {
    showVictoryScreen();
    return;
  }

  gameState.matrices.max = level.maxMatrix;
  gameState.matrices.allocation = level.allocationMatrix;
  gameState.matrices.need = calculateNeedMatrix(level.maxMatrix, level.allocationMatrix);
  gameState.matrices.available = level.availableResources;

  gameState.time = 60;
  gameState.score = 0;

  updateGameDisplay();
  startTimer();

  // ⚠️ Removed: checkSafetyState() on load (was causing instant Game Over)
}

function updateGameDisplay() {
  displayMatrix("Max Matrix", gameState.matrices.max, "maxMatrixContainer");
  displayMatrix("Allocation Matrix", gameState.matrices.allocation, "allocationMatrixContainer");
  displayMatrix("Need Matrix", gameState.matrices.need, "needMatrixContainer");
  displayAvailable();

  // ⚠️ Removed: checkSafetyState() here too
}

function displayMatrix(title, matrix, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `<h3>${title}</h3>`;
  matrix.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("matrix-row");
    row.forEach(val => {
      const cell = document.createElement("div");
      cell.classList.add("matrix-cell");
      cell.textContent = val;
      rowDiv.appendChild(cell);
    });
    container.appendChild(rowDiv);
  });
}

function displayAvailable() {
  const container = document.getElementById("availableContainer");
  if (!container) return;

  container.innerHTML = `<h3>Available Resources</h3>`;
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("matrix-row");
  gameState.matrices.available.forEach(val => {
    const cell = document.createElement("div");
    cell.classList.add("matrix-cell");
    cell.textContent = val;
    rowDiv.appendChild(cell);
  });
  container.appendChild(rowDiv);
}

// ==============================
// Process Execution Logic
// ==============================

function executeProcess(processIndex) {
  const { allocation, need, available } = gameState.matrices;

  if (need[processIndex].every((val, j) => val <= available[j])) {
    // Safe to execute this process
    for (let j = 0; j < available.length; j++) {
      available[j] += allocation[processIndex][j];
      allocation[processIndex][j] = 0;
      need[processIndex][j] = 0;
    }

    gameState.score += 10;
    updateGameDisplay();

    // Now check safety AFTER the process executes
    if (isSafeState(allocation, need, available)) {
      showMessage(`✅ Process P${processIndex} executed safely!`);
    } else {
      gameOver("System entered unsafe state!");
    }
  } else {
    showMessage(`⚠️ P${processIndex} cannot execute now — choose another process!`);
  }
}

// ==============================
// Safety and Game Management
// ==============================

function checkSafetyState() {
  const { allocation, need, available } = gameState.matrices;
  if (!isSafeState(allocation, need, available)) {
    gameOver("System entered unsafe state!");
  }
}

function noProcessCanExecute() {
  const { need, available } = gameState.matrices;
  return need.every(row => !row.every((val, j) => val <= available[j]));
}

function allProcessesFinished() {
  const { need } = gameState.matrices;
  return need.every(row => row.every(val => val === 0));
}

function startTimer() {
  clearInterval(gameState.timer);
  gameState.timer = setInterval(() => {
    gameState.time--;
    document.getElementById("timer").textContent = `Time: ${gameState.time}s`;
    if (gameState.time <= 0) {
      gameOver("⏳ Time’s up!");
    }
  }, 1000);
}

function showMessage(msg) {
  const msgBox = document.getElementById("messageBox");
  if (!msgBox) return;
  msgBox.textContent = msg;
  msgBox.classList.add("show");
  setTimeout(() => msgBox.classList.remove("show"), 2500);
}

function gameOver(reason) {
  clearInterval(gameState.timer);
  const modal = document.getElementById("gameOverModal");
  if (!modal) return;
  modal.querySelector(".reason").textContent = reason;
  modal.querySelector(".finalScore").textContent = `Final Score: ${gameState.score}`;
  modal.classList.add("show");
}

function showVictoryScreen() {
  clearInterval(gameState.timer);
  const modal = document.getElementById("victoryModal");
  if (!modal) return;
  modal.querySelector(".finalScore").textContent = `Final Score: ${gameState.score}`;
  modal.classList.add("show");
}

// ==============================
// UI Button Handlers
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  const processButtons = document.querySelectorAll(".process-btn");
  processButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => executeProcess(index));
  });

  const playAgain = document.getElementById("playAgain");
  if (playAgain) playAgain.addEventListener("click", () => loadLevel(gameState.currentLevel));

  const mainMenu = document.getElementById("mainMenu");
  if (mainMenu) mainMenu.addEventListener("click", () => window.location.href = "index.html");

  loadLevel(1);
});

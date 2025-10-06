// Game Data and State Management
const gameData = {
  gameScenarios: {
    level1: {
      processes: 2,
      resources: 3,
      maxMatrix: [[7,5,3], [3,2,2]],
      allocationMatrix: [[0,1,0], [2,0,0]],
      availableResources: [3,3,2]
    },
    level2: {
      processes: 4,
      resources: 3,
      maxMatrix: [[7,5,3], [3,2,2], [9,0,2], [2,2,2]],
      allocationMatrix: [[0,1,0], [2,0,0], [3,0,2], [2,1,1]],
      availableResources: [3,3,2]
    }
  },
  tutorials: {
    bankerAlgorithm: "The Banker's Algorithm prevents deadlock by ensuring the system never enters an unsafe state. A safe state means there exists a sequence of process execution that allows all processes to complete.",
    deadlockConditions: "Four conditions must be present for deadlock: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.",
    resourceAllocationGraph: "RAG shows the relationship between processes and resources. Cycles in the graph indicate potential deadlock."
  }
};

let gameState = {
  currentScreen: 'mainMenu',
  currentLevel: 1,
  score: 0,
  timeRemaining: 60,
  gameTimer: null,
  selectedProcess: null,
  matrices: {
    max: [],
    allocation: [],
    need: [],
    available: []
  },
  completedProcesses: new Set(),
  isSafe: true
};

let graphState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  draggedNode: null,
  isDragging: false,
  isConnecting: false,
  connectionStart: null,
  canvas: null,
  ctx: null,
  mode: 'rag' // 'rag' or 'waitfor'
};

// Utility Functions
function calculateNeedMatrix(maxMatrix, allocationMatrix) {
  return maxMatrix.map((maxRow, i) => 
    maxRow.map((maxVal, j) => maxVal - allocationMatrix[i][j])
  );
}

function isSafeState(allocation, need, available) {
  const processes = allocation.length;
  const resources = available.length;
  let work = [...available];
  let finish = new Array(processes).fill(false);
  let safeSequence = [];

  let found = true;
  while (found && safeSequence.length < processes) {
    found = false;
    for (let i = 0; i < processes; i++) {
      if (!finish[i] && need[i].every((needVal, j) => needVal <= work[j])) {
        for (let j = 0; j < resources; j++) {
          work[j] += allocation[i][j];
        }
        finish[i] = true;
        safeSequence.push(i);
        found = true;
        break;
      }
    }
  }

  return safeSequence.length === processes ? safeSequence : null;
}

function showScreen(screenId) {
  // Clear any game timers when switching screens
  if (gameState.gameTimer && screenId !== 'bankerGame') {
    clearInterval(gameState.gameTimer);
    gameState.gameTimer = null;
  }

  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
  gameState.currentScreen = screenId;
}

function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// Theme Management
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  document.documentElement.setAttribute('data-color-scheme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-color-scheme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-color-scheme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// Navigation
function initNavigation() {
  // Game card clicks
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const game = card.dataset.game;
      if (game === 'banker') {
        initBankerGame();
        showScreen('bankerGame');
      } else if (game === 'graph') {
        initGraphPlayground();
        showScreen('graphPlayground');
      }
    });
  });

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetScreen = btn.dataset.screen;
      showScreen(targetScreen);
    });
  });

  // Tutorial and scores buttons
  document.getElementById('tutorialBtn').addEventListener('click', () => {
    showScreen('tutorialScreen');
  });

  document.getElementById('scoresBtn').addEventListener('click', () => {
    loadHighScores();
    showScreen('scoresScreen');
  });
}

// Banker Game Logic
function initBankerGame() {
  gameState.currentLevel = 1;
  gameState.score = 0;
  gameState.timeRemaining = 60;
  gameState.completedProcesses.clear();
  gameState.selectedProcess = null;
  
  loadLevel(gameState.currentLevel);
  updateGameDisplay();
  startTimer();
}

function loadLevel(level) {
  const levelKey = `level${level}`;
  let scenario = gameData.gameScenarios[levelKey];
  
  if (!scenario) {
    // Generate random scenario for higher levels
    scenario = generateRandomScenario(level + 2, 3);
  }
  
  gameState.matrices.max = scenario.maxMatrix.map(row => [...row]);
  gameState.matrices.allocation = scenario.allocationMatrix.map(row => [...row]);
  gameState.matrices.available = [...scenario.availableResources];
  gameState.matrices.need = calculateNeedMatrix(
    gameState.matrices.max, 
    gameState.matrices.allocation
  );
  
  updateMatrixDisplays();
  updateProcessButtons();
  checkSafetyState();
}

function generateRandomScenario(processes, resources) {
  const maxMatrix = [];
  const allocationMatrix = [];
  
  for (let i = 0; i < processes; i++) {
    const maxRow = [];
    const allocRow = [];
    for (let j = 0; j < resources; j++) {
      const max = Math.floor(Math.random() * 10) + 1;
      const alloc = Math.floor(Math.random() * (max + 1));
      maxRow.push(max);
      allocRow.push(alloc);
    }
    maxMatrix.push(maxRow);
    allocationMatrix.push(allocRow);
  }
  
  const availableResources = [];
  for (let j = 0; j < resources; j++) {
    const total = Math.floor(Math.random() * 15) + 10;
    const allocated = allocationMatrix.reduce((sum, row) => sum + row[j], 0);
    availableResources.push(Math.max(0, total - allocated));
  }
  
  return { maxMatrix, allocationMatrix, availableResources };
}

function updateMatrixDisplays() {
  updateMatrix('maxMatrix', gameState.matrices.max);
  updateMatrix('allocationMatrix', gameState.matrices.allocation);
  updateMatrix('needMatrix', gameState.matrices.need);
  updateAvailableResources();
}

function updateMatrix(elementId, matrix) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';
  
  matrix.forEach((row, i) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'matrix-row';
    
    row.forEach((cell, j) => {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'matrix-cell';
      cellDiv.textContent = cell;
      rowDiv.appendChild(cellDiv);
    });
    
    container.appendChild(rowDiv);
  });
}

function updateAvailableResources() {
  const container = document.getElementById('availableResources');
  container.innerHTML = '';
  
  gameState.matrices.available.forEach((value, index) => {
    const resourceDiv = document.createElement('div');
    resourceDiv.className = 'resource-item';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'resource-label';
    labelDiv.textContent = `R${index}`;
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'resource-value';
    valueDiv.textContent = value;
    
    resourceDiv.appendChild(labelDiv);
    resourceDiv.appendChild(valueDiv);
    container.appendChild(resourceDiv);
  });
}

function updateProcessButtons() {
  const container = document.getElementById('processButtons');
  container.innerHTML = '';
  
  gameState.matrices.max.forEach((_, index) => {
    const btn = document.createElement('button');
    btn.className = 'process-btn';
    btn.textContent = `P${index}`;
    btn.dataset.process = index;
    
    if (gameState.completedProcesses.has(index)) {
      btn.classList.add('completed');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => selectProcess(index));
    }
    
    container.appendChild(btn);
  });
}

function selectProcess(processIndex) {
  document.querySelectorAll('.process-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  const selectedBtn = document.querySelector(`[data-process="${processIndex}"]`);
  if (selectedBtn && !selectedBtn.disabled) {
    selectedBtn.classList.add('selected');
    gameState.selectedProcess = processIndex;
  }
}

function executeProcess() {
  if (gameState.selectedProcess === null) {
    alert('Please select a process first!');
    return;
  }
  
  const processIndex = gameState.selectedProcess;
  const need = gameState.matrices.need[processIndex];
  const available = gameState.matrices.available;
  
  // Check if request can be satisfied
  const canSatisfy = need.every((needVal, j) => needVal <= available[j]);
  
  if (!canSatisfy) {
    alert('Cannot satisfy this process request with available resources!');
    return;
  }
  
  // Simulate allocation
  const tempAllocation = gameState.matrices.allocation.map(row => [...row]);
  const tempAvailable = [...available];
  
  // Allocate remaining resources to process
  for (let j = 0; j < need.length; j++) {
    tempAllocation[processIndex][j] += need[j];
    tempAvailable[j] -= need[j];
  }
  
  // Process completes, release all resources
  for (let j = 0; j < tempAllocation[processIndex].length; j++) {
    tempAvailable[j] += tempAllocation[processIndex][j];
    tempAllocation[processIndex][j] = 0;
  }
  
  // Update game state
  gameState.matrices.allocation = tempAllocation;
  gameState.matrices.available = tempAvailable;
  gameState.matrices.need = calculateNeedMatrix(
    gameState.matrices.max,
    gameState.matrices.allocation
  );
  
  gameState.completedProcesses.add(processIndex);
  gameState.score += 100;
  gameState.selectedProcess = null;
  
  // Animate the update
  animateMatrixUpdate();
  updateGameDisplay();
  
  // Check if level complete
  if (gameState.completedProcesses.size === gameState.matrices.max.length) {
    levelComplete();
  }
}

function animateMatrixUpdate() {
  document.querySelectorAll('.matrix-cell').forEach(cell => {
    cell.classList.add('updated');
    setTimeout(() => cell.classList.remove('updated'), 500);
  });
}

function checkSafetyState() {
  const safeSequence = isSafeState(
    gameState.matrices.allocation,
    gameState.matrices.need,
    gameState.matrices.available
  );
  
  gameState.isSafe = safeSequence !== null;
  
  const statusElement = document.getElementById('safetyStatus');
  if (gameState.isSafe) {
    statusElement.textContent = 'Safe ✅';
    statusElement.classList.remove('unsafe');
  } else {
    statusElement.textContent = 'Unsafe ❌';
    statusElement.classList.add('unsafe');
    gameOver('System entered unsafe state!');
  }
}

function updateGameDisplay() {
  document.getElementById('currentLevel').textContent = gameState.currentLevel;
  document.getElementById('currentScore').textContent = gameState.score;
  document.getElementById('timeRemaining').textContent = gameState.timeRemaining;
  
  updateMatrixDisplays();
  updateProcessButtons();
  checkSafetyState();
}

function startTimer() {
  if (gameState.gameTimer) {
    clearInterval(gameState.gameTimer);
  }
  
  gameState.gameTimer = setInterval(() => {
    gameState.timeRemaining--;
    document.getElementById('timeRemaining').textContent = gameState.timeRemaining;
    
    if (gameState.timeRemaining <= 0) {
      gameOver('Time\'s up!');
    }
  }, 1000);
}

function levelComplete() {
  clearInterval(gameState.gameTimer);
  
  const levelScore = gameState.timeRemaining * 10;
  gameState.score += levelScore;
  
  document.getElementById('levelScore').textContent = levelScore;
  showModal('levelCompleteModal');
}

function gameOver(message) {
  clearInterval(gameState.gameTimer);
  
  document.getElementById('gameOverMessage').textContent = message;
  document.getElementById('finalScore').textContent = gameState.score;
  
  saveHighScore(gameState.score);
  showModal('gameOverModal');
}

// Graph Playground Logic
function initGraphPlayground() {
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  
  graphState.canvas = canvas;
  graphState.ctx = ctx;
  graphState.nodes = [];
  graphState.edges = [];
  graphState.isDragging = false;
  
  setupGraphEventListeners();
  clearGraph();
}

function setupGraphEventListeners() {
  const canvas = graphState.canvas;
  
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('click', handleCanvasClick);
  
  // Improve cursor feedback
  canvas.addEventListener('mouseover', () => {
    canvas.style.cursor = 'grab';
  });
  
  document.getElementById('addProcess').addEventListener('click', () => addNode('process'));
  document.getElementById('addResource').addEventListener('click', () => addNode('resource'));
  document.getElementById('clearGraph').addEventListener('click', clearGraph);
  document.getElementById('runBanker').addEventListener('click', runBankerOnGraph);
  document.getElementById('graphMode').addEventListener('change', toggleGraphMode);
}

function addNode(type) {
  const canvas = graphState.canvas;
  
  const node = {
    id: Date.now(),
    type: type,
    x: Math.random() * (canvas.width - 100) + 50,
    y: Math.random() * (canvas.height - 100) + 50,
    radius: type === 'process' ? 25 : 20,
    label: type === 'process' ? `P${graphState.nodes.filter(n => n.type === 'process').length}` 
                               : `R${graphState.nodes.filter(n => n.type === 'resource').length}`
  };
  
  graphState.nodes.push(node);
  drawGraph();
}

function clearGraph() {
  graphState.nodes = [];
  graphState.edges = [];
  graphState.selectedNode = null;
  graphState.draggedNode = null;
  graphState.isDragging = false;
  drawGraph();
  updateCycleStatus();
}

function drawGraph() {
  const ctx = graphState.ctx;
  const canvas = graphState.canvas;
  
  // Set canvas size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw edges
  graphState.edges.forEach(edge => {
    const from = graphState.nodes.find(n => n.id === edge.from);
    const to = graphState.nodes.find(n => n.id === edge.to);
    
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = edge.isInCycle ? '#ff4444' : '#666666';
      ctx.lineWidth = edge.isInCycle ? 3 : 2;
      ctx.stroke();
      
      // Draw arrow
      drawArrow(ctx, from.x, from.y, to.x, to.y);
    }
  });
  
  // Draw nodes
  graphState.nodes.forEach(node => {
    ctx.beginPath();
    
    if (node.type === 'process') {
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      let fillColor = '#e0f2f1';
      if (node === graphState.selectedNode) fillColor = '#32a0ad';
      if (node === graphState.draggedNode && graphState.isDragging) fillColor = '#26a69a';
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = '#00695c';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const size = node.radius;
      ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
      let fillColor = '#fff3e0';
      if (node === graphState.selectedNode) fillColor = '#32a0ad';
      if (node === graphState.draggedNode && graphState.isDragging) fillColor = '#26a69a';
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw label
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
  });
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const length = 10;
  const angleOffset = Math.PI / 6;
  
  // Calculate arrow position on edge of target node
  const targetNode = graphState.nodes.find(n => n.x === toX && n.y === toY);
  if (targetNode) {
    const radius = targetNode.radius;
    toX = toX - radius * Math.cos(angle);
    toY = toY - radius * Math.sin(angle);
  }
  
  ctx.beginPath();
  ctx.moveTo(toX - length * Math.cos(angle - angleOffset), toY - length * Math.sin(angle - angleOffset));
  ctx.lineTo(toX, toY);
  ctx.lineTo(toX - length * Math.cos(angle + angleOffset), toY - length * Math.sin(angle + angleOffset));
  ctx.stroke();
}

function handleMouseDown(event) {
  const rect = graphState.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const clickedNode = getNodeAt(x, y);
  
  if (clickedNode) {
    if (event.shiftKey) {
      // Shift+click to connect nodes
      if (graphState.connectionStart) {
        addEdge(graphState.connectionStart.id, clickedNode.id);
        graphState.connectionStart = null;
        graphState.canvas.style.cursor = 'grab';
      } else {
        graphState.connectionStart = clickedNode;
        graphState.canvas.style.cursor = 'crosshair';
      }
    } else {
      // Regular click to select/drag
      graphState.selectedNode = clickedNode;
      graphState.draggedNode = clickedNode;
      graphState.isDragging = true;
      graphState.canvas.style.cursor = 'grabbing';
    }
  } else {
    graphState.selectedNode = null;
    graphState.connectionStart = null;
    graphState.canvas.style.cursor = 'grab';
  }
  
  drawGraph();
}

function handleMouseMove(event) {
  if (graphState.draggedNode && graphState.isDragging) {
    const rect = graphState.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Keep nodes within canvas bounds
    const nodeRadius = graphState.draggedNode.radius;
    graphState.draggedNode.x = Math.max(nodeRadius, Math.min(x, graphState.canvas.width - nodeRadius));
    graphState.draggedNode.y = Math.max(nodeRadius, Math.min(y, graphState.canvas.height - nodeRadius));
    
    drawGraph();
  } else {
    // Show appropriate cursor for hovering
    const rect = graphState.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hoveredNode = getNodeAt(x, y);
    
    if (hoveredNode) {
      graphState.canvas.style.cursor = graphState.connectionStart ? 'crosshair' : 'grab';
    } else {
      graphState.canvas.style.cursor = 'default';
    }
  }
}

function handleMouseUp(event) {
  graphState.draggedNode = null;
  graphState.isDragging = false;
  graphState.canvas.style.cursor = 'grab';
}

function handleCanvasClick(event) {
  // Handle double-click to add edges
  if (event.detail === 2 && graphState.selectedNode && !graphState.isDragging) {
    // Double-click functionality can be added here
  }
}

function getNodeAt(x, y) {
  return graphState.nodes.find(node => {
    if (node.type === 'process') {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    } else {
      // Rectangle node
      const size = node.radius;
      return x >= node.x - size && x <= node.x + size && 
             y >= node.y - size && y <= node.y + size;
    }
  });
}

function addEdge(fromId, toId) {
  if (fromId === toId) return; // No self-loops
  
  const existingEdge = graphState.edges.find(e => 
    (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
  );
  
  if (!existingEdge) {
    graphState.edges.push({ from: fromId, to: toId, isInCycle: false });
    detectCycles();
    drawGraph();
  }
}

function detectCycles() {
  // Reset cycle detection
  graphState.edges.forEach(edge => edge.isInCycle = false);
  
  // Simple cycle detection using DFS
  const visited = new Set();
  const recursionStack = new Set();
  const cycleEdges = new Set();
  
  function hasCycleDFS(nodeId, parent = null) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const neighbors = graphState.edges
      .filter(e => e.from === nodeId || e.to === nodeId)
      .map(e => ({ 
        neighbor: e.from === nodeId ? e.to : e.from, 
        edge: e 
      }));
    
    for (const { neighbor, edge } of neighbors) {
      if (neighbor === parent) continue; // Skip parent in undirected graph
      
      if (recursionStack.has(neighbor)) {
        // Found a cycle
        cycleEdges.add(edge);
        return true;
      }
      
      if (!visited.has(neighbor) && hasCycleDFS(neighbor, nodeId)) {
        cycleEdges.add(edge);
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  // Check for cycles from each unvisited node
  for (const node of graphState.nodes) {
    if (!visited.has(node.id)) {
      hasCycleDFS(node.id);
    }
  }
  
  // Mark cycle edges
  cycleEdges.forEach(edge => edge.isInCycle = true);
  
  updateCycleStatus(cycleEdges.size > 0);
}

function updateCycleStatus(hasCycle = null) {
  const statusElement = document.getElementById('cycleStatus');
  const actualHasCycle = hasCycle !== null ? hasCycle : 
    graphState.edges.some(edge => edge.isInCycle);
  
  if (actualHasCycle) {
    statusElement.textContent = 'Deadlock detected! 🔴';
    statusElement.classList.add('has-cycle');
  } else {
    statusElement.textContent = 'No cycles detected ✅';
    statusElement.classList.remove('has-cycle');
  }
}

function toggleGraphMode() {
  const checkbox = document.getElementById('graphMode');
  graphState.mode = checkbox.checked ? 'rag' : 'waitfor';
  // Mode change logic can be implemented here
  drawGraph();
}

function runBankerOnGraph() {
  if (graphState.nodes.length === 0) {
    alert('Please add some nodes to the graph first!');
    return;
  }
  
  const processes = graphState.nodes.filter(n => n.type === 'process').length;
  const resources = graphState.nodes.filter(n => n.type === 'resource').length;
  
  alert(`Graph Analysis:\nProcesses: ${processes}\nResources: ${resources}\nEdges: ${graphState.edges.length}\n\nThis would run the Banker's Algorithm to check for safe allocation sequences.`);
}

// Score Management
function saveHighScore(score) {
  const scores = JSON.parse(localStorage.getItem('bankerHighScores') || '[]');
  scores.push({ score, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(10); // Keep only top 10
  localStorage.setItem('bankerHighScores', JSON.stringify(scores));
}

function loadHighScores() {
  const scores = JSON.parse(localStorage.getItem('bankerHighScores') || '[]');
  const container = document.getElementById('bankerScores');
  
  if (scores.length === 0) {
    container.innerHTML = '<p class="no-scores">No scores yet! Play to set your first score.</p>';
    return;
  }
  
  container.innerHTML = scores.map((score, index) => 
    `<div class="score-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
      <span class="score-rank" style="font-weight: bold;">#${index + 1}</span>
      <span class="score-value" style="color: var(--color-primary);">${score.score} points</span>
      <span class="score-date" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${score.date}</span>
    </div>`
  ).join('');
}

// Event Listeners for Game Controls
function initGameControls() {
  document.getElementById('executeProcess').addEventListener('click', executeProcess);
  document.getElementById('checkSafety').addEventListener('click', checkSafetyState);
  
  // Modal controls
  document.getElementById('playAgain').addEventListener('click', () => {
    hideModal('gameOverModal');
    initBankerGame();
  });
  
  document.getElementById('backToMenu').addEventListener('click', () => {
    hideModal('gameOverModal');
    showScreen('mainMenu');
  });
  
  document.getElementById('nextLevel').addEventListener('click', () => {
    hideModal('levelCompleteModal');
    gameState.currentLevel++;
    gameState.timeRemaining = Math.max(30, 60 - (gameState.currentLevel * 5));
    loadLevel(gameState.currentLevel);
    updateGameDisplay();
    startTimer();
  });
  
  document.getElementById('backToMenuFromLevel').addEventListener('click', () => {
    hideModal('levelCompleteModal');
    showScreen('mainMenu');
  });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initGameControls();
  
  // Show main menu
  showScreen('mainMenu');
});

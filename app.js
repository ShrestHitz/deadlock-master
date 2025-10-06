// =====================
// Game Data and State
// =====================
const gameData = {
gameScenarios: {
level1: {
processes: 2,
resources: 3,
maxMatrix: [, ],
allocationMatrix: [, ],
availableResources:
},
level2: {
processes: 4,
resources: 3,
maxMatrix: [, , , ],
allocationMatrix: [, , , ],
availableResources:
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
isSafe: true,
hasStartedTimer: false
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

// =====================
// Utilities
// =====================
function calculateNeedMatrix(maxMatrix, allocationMatrix) {
return maxMatrix.map((maxRow, i) =>
maxRow.map((maxVal, j) => maxVal - allocationMatrix[i][j])
);
}

// Returns { safe: boolean, sequence: number[] }
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
}
}
}

return { safe: safeSequence.length === processes, sequence: safeSequence };
}

function showScreen(screenId) {
if (gameState.gameTimer && screenId !== 'bankerGame') {
clearInterval(gameState.gameTimer);
gameState.gameTimer = null;
gameState.hasStartedTimer = false;
}
document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
document.getElementById(screenId).classList.add('active');
gameState.currentScreen = screenId;
}

function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

// =====================
// Theme
// =====================
function initTheme() {
const btn = document.getElementById('themeToggle');
const saved = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-color-scheme', saved);
btn.textContent = saved === 'dark' ? '☀️' : '🌙';
btn.addEventListener('click', () => {
const cur = document.documentElement.getAttribute('data-color-scheme');
const next = cur === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-color-scheme', next);
localStorage.setItem('theme', next);
btn.textContent = next === 'dark' ? '☀️' : '🌙';
});
}

// =====================
// Navigation
// =====================
function initNavigation() {
document.querySelectorAll('.game-card').forEach(card => {
card.addEventListener('click', () => {
const game = card.dataset.game;
if (game === 'banker') {
initBankerGame();
showScreen('bankerGame');
} else {
initGraphPlayground();
showScreen('graphPlayground');
}
});
});
document.querySelectorAll('.back-btn').forEach(btn => {
btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});
document.getElementById('tutorialBtn').addEventListener('click', () => showScreen('tutorialScreen'));
document.getElementById('scoresBtn').addEventListener('click', () => { loadHighScores(); showScreen('scoresScreen'); });
}

// =====================
// Banker Game
// =====================
function initBankerGame() {
gameState.currentLevel = 1;
gameState.score = 0;
gameState.timeRemaining = 60;
gameState.completedProcesses.clear();
gameState.selectedProcess = null;
gameState.hasStartedTimer = false;

loadLevel(gameState.currentLevel);
updateGameDisplay();
// Do not start timer yet; start after first successful execute
}

function loadLevel(level) {
const levelKey = level${level};
let scenario = gameData.gameScenarios[levelKey] || generateRandomScenario(level + 2, 3);

gameState.matrices.max = scenario.maxMatrix.map(r => [...r]);
gameState.matrices.allocation = scenario.allocationMatrix.map(r => [...r]);
gameState.matrices.available = [...scenario.availableResources];
gameState.matrices.need = calculateNeedMatrix(gameState.matrices.max, gameState.matrices.allocation);

updateMatrixDisplays();
updateProcessButtons();

const safety = isSafeState(gameState.matrices.allocation, gameState.matrices.need, gameState.matrices.available);
gameState.isSafe = safety.safe;
updateSafetyBadge(safety.safe, safety.sequence);
}

function generateRandomScenario(processes, resources) {
const maxMatrix = [];
const allocationMatrix = [];
for (let i = 0; i < processes; i++) {
const maxRow = [], allocRow = [];
for (let j = 0; j < resources; j++) {
const mx = Math.floor(Math.random() * 10) + 1;
const al = Math.floor(Math.random() * (mx + 1));
maxRow.push(mx); allocRow.push(al);
}
maxMatrix.push(maxRow);
allocationMatrix.push(allocRow);
}
const availableResources = [];
for (let j = 0; j < resources; j++) {
const total = Math.floor(Math.random() * 15) + 10;
const allocated = allocationMatrix.reduce((s, r) => s + r[j], 0);
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

function updateMatrix(id, matrix) {
const container = document.getElementById(id);
container.innerHTML = '';
matrix.forEach(row => {
const rowDiv = document.createElement('div');
rowDiv.className = 'matrix-row';
row.forEach(cell => {
const cellDiv = document.createElement('div');
cellDiv.className = 'matrix-cell';
cellDiv.textContent = cell;
rowDiv.appendChild(cellDiv);
});
container.appendChild(rowDiv);
});
}

function updateAvailableResources() {
const c = document.getElementById('availableResources');
c.innerHTML = '';
gameState.matrices.available.forEach((v, idx) => {
const item = document.createElement('div');
item.className = 'resource-item';
const label = document.createElement('div');
label.className = 'resource-label';
label.textContent = R${idx};
const val = document.createElement('div');
val.className = 'resource-value';
val.textContent = v;
item.appendChild(label); item.appendChild(val);
c.appendChild(item);
});
}

function updateProcessButtons() {
const c = document.getElementById('processButtons');
c.innerHTML = '';
gameState.matrices.max.forEach((_, i) => {
const btn = document.createElement('button');
btn.className = 'process-btn';
btn.textContent = P${i};
btn.dataset.process = i;
if (gameState.completedProcesses.has(i)) {
btn.classList.add('completed'); btn.disabled = true;
} else {
btn.addEventListener('click', () => selectProcess(i));
}
c.appendChild(btn);
});
}

function selectProcess(i) {
document.querySelectorAll('.process-btn').forEach(b => b.classList.remove('selected'));
const btn = document.querySelector([data-process="${i}"]);
if (btn && !btn.disabled) { btn.classList.add('selected'); gameState.selectedProcess = i; }
}

function updateSafetyBadge(isSafe) {
const el = document.getElementById('safetyStatus');
if (isSafe) {
el.textContent = 'Safe ✅';
el.classList.remove('unsafe');
} else {
el.textContent = 'Unsafe ❌';
el.classList.add('unsafe');
}
}

function pulseUnsafeBadge() {
const el = document.getElementById('safetyStatus');
el.classList.add('pulse-unsafe');
setTimeout(() => el.classList.remove('pulse-unsafe'), 700);
}

function executeProcess() {
if (gameState.selectedProcess === null) { alert('Please select a process first!'); return; }
const i = gameState.selectedProcess;
const need = gameState.matrices.need[i];
const available = gameState.matrices.available;

const canSatisfy = need.every((nv, j) => nv <= available[j]);
if (!canSatisfy) { alert('Cannot satisfy this process request with available resources!'); return; }

// Tentative apply for safety check
const trialAlloc = gameState.matrices.allocation.map(r => [...r]);
const trialAvail = [...available];

for (let j = 0; j < need.length; j++) {
trialAlloc[i][j] += need[j];
trialAvail[j] -= need[j];
}
// Process completes → release its allocation
for (let j = 0; j < trialAlloc[i].length; j++) {
trialAvail[j] += trialAlloc[i][j];
trialAlloc[i][j] = 0;
}

const safety = isSafeState(trialAlloc, calculateNeedMatrix(gameState.matrices.max, trialAlloc), trialAvail);
if (!safety.safe) {
pulseUnsafeBadge();
alert('Unsafe allocation – action reverted.');
return;
}

// Commit
gameState.matrices.allocation = trialAlloc;
gameState.matrices.available = trialAvail;
gameState.matrices.need = calculateNeedMatrix(gameState.matrices.max, trialAlloc);
gameState.completedProcesses.add(i);
gameState.score += 100;
gameState.selectedProcess = null;

if (!gameState.hasStartedTimer) { startTimer(); gameState.hasStartedTimer = true; }

animateMatrixUpdate();
updateGameDisplay();

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
const res = isSafeState(gameState.matrices.allocation, gameState.matrices.need, gameState.matrices.available);
gameState.isSafe = res.safe;
updateSafetyBadge(res.safe);
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
if (gameState.gameTimer) clearInterval(gameState.gameTimer);
gameState.gameTimer = setInterval(() => {
gameState.timeRemaining--;
document.getElementById('timeRemaining').textContent = gameState.timeRemaining;
if (gameState.timeRemaining <= 0) {
clearInterval(gameState.gameTimer);
gameState.gameTimer = null;
showGameOver("Time's up!");
}
}, 1000);
}

function levelComplete() {
if (gameState.gameTimer) { clearInterval(gameState.gameTimer); gameState.gameTimer = null; }
const levelScore = gameState.timeRemaining * 10;
gameState.score += levelScore;
document.getElementById('levelScore').textContent = levelScore;
showModal('levelCompleteModal');
}

function showGameOver(msg) {
document.getElementById('gameOverMessage').textContent = msg;
document.getElementById('finalScore').textContent = gameState.score;
saveHighScore(gameState.score);
showModal('gameOverModal');
}

function gameOver(msg) {
if (gameState.gameTimer) { clearInterval(gameState.gameTimer); gameState.gameTimer = null; }
showGameOver(msg);
}

// =====================
// Graph Playground
// =====================
function initGraphPlayground() {
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
graphState.canvas = canvas; graphState.ctx = ctx;
graphState.nodes = []; graphState.edges = [];
graphState.isDragging = false;
setupGraphEventListeners();
clearGraph();
}

function setupGraphEventListeners() {
const c = graphState.canvas;
c.addEventListener('mousedown', handleMouseDown);
c.addEventListener('mousemove', handleMouseMove);
c.addEventListener('mouseup', handleMouseUp);
c.addEventListener('click', handleCanvasClick);
c.addEventListener('mouseover', () => c.style.cursor = 'grab');

document.getElementById('addProcess').addEventListener('click', () => addNode('process'));
document.getElementById('addResource').addEventListener('click', () => addNode('resource'));
document.getElementById('clearGraph').addEventListener('click', clearGraph);
document.getElementById('runBanker').addEventListener('click', runBankerOnGraph);
document.getElementById('graphMode').addEventListener('change', toggleGraphMode);
}

function addNode(type) {
const c = graphState.canvas;
const node = {
id: Date.now() + Math.random(),
type,
x: Math.random() * (c.width - 100) + 50,
y: Math.random() * (c.height - 100) + 50,
radius: type === 'process' ? 25 : 20,
label: type === 'process'
? P${graphState.nodes.filter(n => n.type === 'process').length}
: R${graphState.nodes.filter(n => n.type === 'resource').length}
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
const ctx = graphState.ctx, c = graphState.canvas;
const rect = c.getBoundingClientRect(); c.width = rect.width; c.height = rect.height;
ctx.clearRect(0, 0, c.width, c.height);

graphState.edges.forEach(e => {
const from = graphState.nodes.find(n => n.id === e.from);
const to = graphState.nodes.find(n => n.id === e.to);
if (!from || !to) return;
ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
ctx.strokeStyle = e.isInCycle ? '#ff4444' : '#666666';
ctx.lineWidth = e.isInCycle ? 3 : 2; ctx.stroke();
drawArrow(ctx, from.x, from.y, to.x, to.y);
});

graphState.nodes.forEach(n => {
ctx.beginPath();
if (n.type === 'process') {
ctx.arc(n.x, n.y, n.radius, 0, 2Math.PI);
let fill = '#e0f2f1';
if (n === graphState.selectedNode) fill = '#32a0ad';
if (n === graphState.draggedNode && graphState.isDragging) fill = '#26a69a';
ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#00695c'; ctx.lineWidth = 2; ctx.stroke();
} else {
const s = n.radius;
ctx.rect(n.x - s, n.y - s, s2, s*2);
let fill = '#fff3e0';
if (n === graphState.selectedNode) fill = '#32a0ad';
if (n === graphState.draggedNode && graphState.isDragging) fill = '#26a69a';
ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#e65100'; ctx.lineWidth = 2; ctx.stroke();
}
ctx.fillStyle = '#000'; ctx.font = '14px Arial, sans-serif';
ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.label, n.x, n.y);
});
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
const angle = Math.atan2(toY - fromY, toX - fromX);
const len = 10, off = Math.PI/6;
ctx.beginPath();
ctx.moveTo(toX - lenMath.cos(angle - off), toY - lenMath.sin(angle - off));
ctx.lineTo(toX, toY);
ctx.lineTo(toX - lenMath.cos(angle + off), toY - lenMath.sin(angle + off));
ctx.stroke();
}

function handleMouseDown(e) {
const r = graphState.canvas.getBoundingClientRect();
const x = e.clientX - r.left, y = e.clientY - r.top;
const hit = getNodeAt(x, y);

if (hit) {
if (e.shiftKey) {
if (graphState.connectionStart) {
addEdge(graphState.connectionStart.id, hit.id);
graphState.connectionStart = null;
graphState.canvas.style.cursor = 'grab';
} else {
graphState.connectionStart = hit;
graphState.canvas.style.cursor = 'crosshair';
}
} else {
graphState.selectedNode = hit;
graphState.draggedNode = hit;
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

function handleMouseMove(e) {
if (graphState.draggedNode && graphState.isDragging) {
const r = graphState.canvas.getBoundingClientRect();
const x = e.clientX - r.left, y = e.clientY - r.top;
const rad = graphState.draggedNode.radius;
graphState.draggedNode.x = Math.max(rad, Math.min(x, graphState.canvas.width - rad));
graphState.draggedNode.y = Math.max(rad, Math.min(y, graphState.canvas.height - rad));
drawGraph();
} else {
const r = graphState.canvas.getBoundingClientRect();
const x = e.clientX - r.left, y = e.clientY - r.top;
const hover = getNodeAt(x, y);
graphState.canvas.style.cursor = hover ? (graphState.connectionStart ? 'crosshair' : 'grab') : 'default';
}
}

function handleMouseUp() {
graphState.draggedNode = null;
graphState.isDragging = false;
graphState.canvas.style.cursor = 'grab';
}

function handleCanvasClick(e) {
if (e.detail === 2 && graphState.selectedNode && !graphState.isDragging) {
// reserved for future feature
}
}

function getNodeAt(x, y) {
return graphState.nodes.find(n => {
if (n.type === 'process') {
const dx = x - n.x, dy = y - n.y;
return Math.sqrt(dxdx + dydy) <= n.radius;
} else {
const s = n.radius;
return x >= n.x - s && x <= n.x + s && y >= n.y - s && y <= n.y + s;
}
});
}

function addEdge(fromId, toId) {
if (fromId === toId) return;
const exists = graphState.edges.find(e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId));
if (!exists) {
graphState.edges.push({ from: fromId, to: toId, isInCycle: false });
detectCycles();
drawGraph();
}
}

function detectCycles() {
graphState.edges.forEach(e => e.isInCycle = false);
const visited = new Set(), stack = new Set(), cyc = new Set();

function dfs(id, parent = null) {
visited.add(id); stack.add(id);
const neighbors = graphState.edges
.filter(e => e.from === id || e.to === id)
.map(e => ({ n: e.from === id ? e.to : e.from, e }));
for (const { n, e } of neighbors) {
if (n === parent) continue;
if (stack.has(n)) { cyc.add(e); return true; }
if (!visited.has(n) && dfs(n, id)) { cyc.add(e); return true; }
}
stack.delete(id);
return false;
}

for (const node of graphState.nodes) if (!visited.has(node.id)) dfs(node.id);
cyc.forEach(e => e.isInCycle = true);
updateCycleStatus(cyc.size > 0);
}

function updateCycleStatus(hasCycle = null) {
const el = document.getElementById('cycleStatus');
const flag = hasCycle !== null ? hasCycle : graphState.edges.some(e => e.isInCycle);
if (flag) { el.textContent = 'Deadlock detected! 🔴'; el.classList.add('has-cycle'); }
else { el.textContent = 'No cycles detected ✅'; el.classList.remove('has-cycle'); }
}

function toggleGraphMode() {
const cb = document.getElementById('graphMode');
graphState.mode = cb.checked ? 'rag' : 'waitfor';
drawGraph();
}

function runBankerOnGraph() {
if (graphState.nodes.length === 0) { alert('Please add some nodes to the graph first!'); return; }
const p = graphState.nodes.filter(n => n.type === 'process').length;
const r = graphState.nodes.filter(n => n.type === 'resource').length;
alert(`Graph Analysis:
Processes: ${p}
Resources: ${r}
Edges: ${graphState.edges.length}

This would run the Banker's Algorithm to check for safe allocation sequences.`);
}

// =====================
// Scores
// =====================
function saveHighScore(score) {
const scores = JSON.parse(localStorage.getItem('bankerHighScores') || '[]');
scores.push({ score, date: new Date().toLocaleDateString() });
scores.sort((a,b) => b.score - a.score);
scores.splice(10);
localStorage.setItem('bankerHighScores', JSON.stringify(scores));
}

function loadHighScores() {
const scores = JSON.parse(localStorage.getItem('bankerHighScores') || '[]');
const c = document.getElementById('bankerScores');
if (scores.length === 0) { c.innerHTML = '<p class="no-scores">No scores yet! Play to set your first score.</p>'; return; }
c.innerHTML = scores.map((s,i) =>
<div class="score-item" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border);"> <span class="score-rank" style="font-weight:bold;">#${i+1}</span> <span class="score-value" style="color:var(--color-primary);">${s.score} points</span> <span class="score-date" style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">${s.date}</span> </div>
).join('');
}

// =====================
// Controls & Init
// =====================
function initGameControls() {
document.getElementById('executeProcess').addEventListener('click', executeProcess);
document.getElementById('checkSafety').addEventListener('click', checkSafetyState);

document.getElementById('playAgain').addEventListener('click', () => { hideModal('gameOverModal'); initBankerGame(); });
document.getElementById('backToMenu').addEventListener('click', () => { hideModal('gameOverModal'); showScreen('mainMenu'); });

document.getElementById('nextLevel').addEventListener('click', () => {
hideModal('levelCompleteModal');
gameState.currentLevel++;
gameState.timeRemaining = Math.max(30, 60 - (gameState.currentLevel * 5));
gameState.hasStartedTimer = false;
loadLevel(gameState.currentLevel);
updateGameDisplay();
});

document.getElementById('backToMenuFromLevel').addEventListener('click', () => { hideModal('levelCompleteModal'); showScreen('mainMenu'); });
}

document.addEventListener('DOMContentLoaded', () => {
initTheme();
initNavigation();
initGameControls();
showScreen('mainMenu');
});

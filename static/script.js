let nQubits = 3;
let timeSteps = 6; // columns
let gates = [];
const states = ["|0⟩", "|1⟩", "|+⟩", "|-⟩", "|i⟩", "|-i⟩"];

const circuitArea = document.getElementById("circuit-area");

function renderCircuit() {
  circuitArea.innerHTML = '';
  for (let q = 0; q < nQubits; q++) {
    const line = document.createElement('div');
    line.className = 'qubit-line';
    line.dataset.q = q;

    const wire = document.createElement('div');
    wire.className = 'qubit-wire';
    line.appendChild(wire);

    const state = document.createElement('div');
    state.className = 'state';
    state.textContent = states[0];
    state.addEventListener('click', () => {
      let i = states.indexOf(state.textContent);
      state.textContent = states[(i + 1) % states.length];
    });
    line.appendChild(state);

    const grid = document.createElement('div');
    grid.className = 'grid';

    for (let t = 0; t < timeSteps; t++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.q = q;
      cell.dataset.t = t;

      cell.addEventListener('dragover', e => {
        e.preventDefault();
        cell.classList.add('dragover');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('dragover'));
      cell.addEventListener('drop', e => dropGate(e, cell));

      grid.appendChild(cell);
    }

    line.appendChild(grid);
    circuitArea.appendChild(line);
  }

  // Redraw all gates
  for (const g of gates) {
    placeGateVisual(g);
  }
}

function dropGate(e, cell) {
  e.preventDefault();
  cell.classList.remove('dragover');
  const type = e.dataTransfer.getData('gate');
  const q = parseInt(cell.dataset.q);
  const t = parseInt(cell.dataset.t);

  let gate = { type, target: q, time: t };
  if (type === "CNOT") {
    const control = prompt("Enter control qubit number:");
    if (control === null) return;
    gate.control = parseInt(control);
  }
  gates.push(gate);
  renderCircuit();
}

function placeGateVisual(g) {
  const selector = `.cell[data-q="${g.target}"][data-t="${g.time}"]`;
  const cell = document.querySelector(selector);
  if (!cell) return;

  const gateEl = document.createElement('div');
  gateEl.className = 'gate-placed';
  gateEl.textContent = g.type;

  const remove = document.createElement('div');
  remove.className = 'remove-btn';
  remove.textContent = '×';
  remove.onclick = () => {
    gates = gates.filter(x => x !== g);
    renderCircuit();
  };

  gateEl.appendChild(remove);
  cell.appendChild(gateEl);

  if (g.type === "CNOT" && g.control !== undefined) {
    const targetCell = document.querySelector(`.cell[data-q="${g.target}"][data-t="${g.time}"]`);
    const controlCell = document.querySelector(`.cell[data-q="${g.control}"][data-t="${g.time}"]`);
    if (targetCell && controlCell) {
      const line = document.createElement('div');
      line.className = 'cnot-line';
      const top = Math.min(controlCell.getBoundingClientRect().top, targetCell.getBoundingClientRect().top);
      const bottom = Math.max(controlCell.getBoundingClientRect().bottom, targetCell.getBoundingClientRect().bottom);
      const offsetTop = top - circuitArea.getBoundingClientRect().top + 20;
      line.style.top = `${offsetTop}px`;
      line.style.left = `${controlCell.offsetLeft + 60}px`;
      line.style.height = `${bottom - top}px`;
      circuitArea.appendChild(line);
    }
  }
}

document.querySelectorAll('.gate').forEach(g => {
  g.addEventListener('dragstart', e => e.dataTransfer.setData('gate', g.dataset.gate));
});

document.getElementById('add-qubit').onclick = () => {
  if (nQubits < 6) {
    nQubits++;
    renderCircuit();
  }
};

document.getElementById('remove-qubit').onclick = () => {
  if (nQubits > 1) {
    nQubits--;
    gates = gates.filter(g => g.target < nQubits && (g.control ?? 0) < nQubits);
    renderCircuit();
  }
};

document.getElementById('simulate-btn').onclick = async () => {
  const initStates = Array.from(document.querySelectorAll('.state')).map(s => s.textContent);
  const res = await fetch('/simulate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ n_qubits: nQubits, gates, init_states: initStates })
  });
  const data = await res.json();
  document.getElementById('circuit-output').textContent = data.diagram;
  document.getElementById('results-output').textContent = JSON.stringify(data.results, null, 2);
};

renderCircuit();

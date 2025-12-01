let nQubits = 3;
let timeSteps = 12; // more columns
let gates = []; // Our single source of truth for the circuit's state
const states = ["|0⟩", "|1⟩", "|+⟩", "|-⟩", "|i⟩", "|-i⟩"];

// --- PURE JS QUANTUM SIMULATOR ---
// A simple state vector simulator for basic gates.

class Complex {
  constructor(re, im) { this.re = re; this.im = im; }
  add(c) { return new Complex(this.re + c.re, this.im + c.im); }
  sub(c) { return new Complex(this.re - c.re, this.im - c.im); }
  mul(c) { return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re); }
  magSq() { return this.re * this.re + this.im * this.im; }
}

const C_ZERO = new Complex(0, 0);
const C_ONE = new Complex(1, 0);

// Gates as 2x2 matrices
const GATES = {
  'X': [[0, 1], [1, 0]],
  'Y': [[0, new Complex(0, -1)], [new Complex(0, 1), 0]],
  'Z': [[1, 0], [0, -1]],
  'H': [[1 / Math.sqrt(2), 1 / Math.sqrt(2)], [1 / Math.sqrt(2), -1 / Math.sqrt(2)]],
  'S': [[1, 0], [0, new Complex(0, 1)]],
  'T': [[1, 0], [0, new Complex(1 / Math.sqrt(2), 1 / Math.sqrt(2))]]
};

function applyGate(state, gateName, targetQubit, nQubits) {
  const newState = new Array(state.length).fill(C_ZERO);
  const gate = GATES[gateName];

  for (let i = 0; i < state.length; i++) {
    if (state[i].magSq() === 0) continue;

    // Determine if the target qubit is 0 or 1 in this basis state
    // Qubit 0 is the least significant bit? Let's match Cirq's convention (usually 0 is MSB or LSB).
    // Let's assume Qubit 0 is the first one (index 0).
    // If nQubits=3, state index is b0 b1 b2.
    // Let's say qubit 0 is the most significant bit (leftmost).
    // i = b0 * 2^(n-1) + ...

    const shift = nQubits - 1 - targetQubit;
    const isOne = (i >> shift) & 1;
    const partner = i ^ (1 << shift); // The state with the target qubit flipped

    // Matrix multiplication
    // |0> -> m00|0> + m10|1>
    // |1> -> m01|0> + m11|1>

    // If we are at |0> (isOne=0), we contribute to |0> (self) and |1> (partner)
    // If we are at |1> (isOne=1), we contribute to |0> (partner) and |1> (self)

    const m00 = toComplex(gate[0][0]);
    const m01 = toComplex(gate[0][1]);
    const m10 = toComplex(gate[1][0]);
    const m11 = toComplex(gate[1][1]);

    if (isOne === 0) {
      // Input is |0>. Output contributes to |0> (i) and |1> (partner)
      newState[i] = newState[i].add(state[i].mul(m00));
      newState[partner] = newState[partner].add(state[i].mul(m10));
    } else {
      // Input is |1>. Output contributes to |0> (partner) and |1> (i)
      newState[partner] = newState[partner].add(state[i].mul(m01));
      newState[i] = newState[i].add(state[i].mul(m11));
    }
  }
  return newState;
}

function applyCNOT(state, control, target, nQubits) {
  const newState = [...state];
  const cShift = nQubits - 1 - control;
  const tShift = nQubits - 1 - target;

  for (let i = 0; i < state.length; i++) {
    // If control bit is 1, swap target bit
    if (((i >> cShift) & 1) && control !== target) { // Ensure control and target are different
      const partner = i ^ (1 << tShift);
      if (i < partner) { // Swap only once for each pair
        const temp = newState[i];
        newState[i] = newState[partner];
        newState[partner] = temp;
      }
    }
  }
  return newState;
}

function toComplex(val) {
  if (val instanceof Complex) return val;
  return new Complex(val, 0);
}

function simulateCircuit(nQubits, gates, initStates) {
  const size = 1 << nQubits;
  let state = new Array(size).fill(C_ZERO);

  // Initialize state
  // Calculate initial index based on initStates (e.g., |0>, |1>)
  // For simplicity, let's handle |0> and |1> correctly. 
  // Superposition in init states is harder without full tensor product, 
  // but we can just start at |00..0> and apply gates.

  // Start at |00...0>
  state[0] = C_ONE;

  // Apply initialization gates
  for (let i = 0; i < nQubits; i++) {
    const s = initStates[i];
    if (s === "|1⟩") state = applyGate(state, 'X', i, nQubits);
    else if (s === "|+⟩") state = applyGate(state, 'H', i, nQubits);
    else if (s === "|-⟩") { state = applyGate(state, 'X', i, nQubits); state = applyGate(state, 'H', i, nQubits); }
    else if (s === "|i⟩") { state = applyGate(state, 'H', i, nQubits); state = applyGate(state, 'S', i, nQubits); }
    else if (s === "|-i⟩") {
      // S inverse is Z * S
      state = applyGate(state, 'H', i, nQubits);
      state = applyGate(state, 'Z', i, nQubits);
      state = applyGate(state, 'S', i, nQubits);
    }
  }

  // Apply circuit gates
  // Sort gates by time? The UI sends them in order? 
  // The UI 'gates' array might not be sorted by time.
  // Let's sort them.
  const sortedGates = [...gates].sort((a, b) => a.time - b.time);

  for (const g of sortedGates) {
    if (g.type === "CNOT") {
      state = applyCNOT(state, g.control, g.target, nQubits);
    } else {
      state = applyGate(state, g.type, g.target, nQubits);
    }
  }

  return state;
}

function measure(state, nQubits, shots = 500) {
  const probs = state.map(c => c.magSq());
  const counts = {};

  for (let s = 0; s < shots; s++) {
    let r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r < cumulative) {
        // Found the state i
        const bin = i.toString(2).padStart(nQubits, '0');
        counts[bin] = (counts[bin] || 0) + 1;
        break;
      }
    }
  }
  return counts;
}

// Simple ASCII diagram generator (basic)
function generateDiagram(nQubits, gates) {
  let lines = Array(nQubits).fill("");
  const maxTime = gates.reduce((max, g) => Math.max(max, g.time), 0);

  for (let t = 0; t <= maxTime; t++) {
    const gatesAtT = gates.filter(g => g.time === t);
    for (let q = 0; q < nQubits; q++) {
      const g = gatesAtT.find(g => g.target === q || g.control === q);
      if (g) {
        if (g.type === "CNOT") {
          lines[q] += (g.control === q ? "@" : "X") + "-";
        } else {
          lines[q] += g.type + "-";
        }
      } else {
        // Check if a vertical line passes through (for CNOT)
        const cnot = gatesAtT.find(g => g.type === "CNOT");
        if (cnot && q > Math.min(cnot.control, cnot.target) && q < Math.max(cnot.control, cnot.target)) {
          lines[q] += "|-";
        } else {
          lines[q] += "--";
        }
      }
    }
  }
  return lines.map((l, i) => `(${i}) : -${l}`).join("\n");
}

// --- END SIMULATOR ---



// --- UPDATED: State machine for placing CNOT gates ---
// We now store the control qubit AND the time step of the initial drop
// to show a temporary visual marker.
let cnotPlacementState = {
  isPlacing: false,
  controlQubit: null,
  controlTimeStep: null // To know where to draw the pending marker
};

const circuitArea = document.getElementById("circuit-area");

function renderCircuit() {
  circuitArea.innerHTML = ''; // Clear the entire grid

  for (let q = 0; q < nQubits; q++) {
    const line = document.createElement('div');
    line.className = 'qubit-line';
    line.dataset.q = q;

    const wire = document.createElement('div');
    wire.className = 'qubit-wire';
    line.appendChild(wire);

    const state = document.createElement('div');
    state.className = 'state';
    const existingState = document.querySelector(`.state[data-qubit='${q}']`);
    state.textContent = existingState ? existingState.textContent : states[0];
    state.dataset.qubit = q;
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

      cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('dragover'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('dragover'));
      cell.addEventListener('drop', e => dropHandler(e, cell));
      cell.addEventListener('click', () => cellClickHandler(cell));

      grid.appendChild(cell);
    }

    line.appendChild(grid);
    circuitArea.appendChild(line);
  }

  // After creating the grid, render all gates from our `gates` array
  gates.forEach(placeGateVisual);

  // --- NEW: If we are in the middle of placing a CNOT, show a visual indicator ---
  if (cnotPlacementState.isPlacing) {
    const controlCell = document.querySelector(`.cell[data-q="${cnotPlacementState.controlQubit}"][data-t="${cnotPlacementState.controlTimeStep}"]`);
    if (controlCell) {
      const pendingControl = document.createElement('div');
      pendingControl.className = 'cnot-pending-control';
      // Add a click listener to the pending dot to allow canceling
      pendingControl.onclick = (e) => {
        e.stopPropagation();
        resetCnotState();
        renderCircuit();
      };
      controlCell.appendChild(pendingControl);
    }
  }
}

function dropHandler(e, cell) {
  e.preventDefault();
  cell.classList.remove('dragover');
  const type = e.dataTransfer.getData('gate');
  const q = parseInt(cell.dataset.q);
  const t = parseInt(cell.dataset.t);

  // If a gate already exists in this cell, do nothing.
  if (gates.some(g => g.time === t && (g.target === q || g.control === q))) {
    return;
  }

  // --- UPDATED CNOT LOGIC ---
  if (type === "CNOT") {
    // Start placing a CNOT. We only record the CONTROL qubit and its UI position.
    // The final gate's time step is not yet decided.
    resetCnotState();
    cnotPlacementState.isPlacing = true;
    cnotPlacementState.controlQubit = q;
    cnotPlacementState.controlTimeStep = t;
  } else {
    // It's a single-qubit gate. Add it directly to the array.
    resetCnotState();
    gates.push({ type, target: q, time: t });
  }
  renderCircuit();
}

function cellClickHandler(cell) {
  if (!cnotPlacementState.isPlacing) return;

  const targetQubit = parseInt(cell.dataset.q);
  const targetTimeStep = parseInt(cell.dataset.t); // This is the key change!

  // Check if the click is on a valid target (different qubit)
  if (targetQubit !== cnotPlacementState.controlQubit) {
    // --- The ENTIRE CNOT gate is created at the TARGET's time step ---
    gates.push({
      type: "CNOT",
      control: cnotPlacementState.controlQubit,
      target: targetQubit,
      time: targetTimeStep // The logical time of the gate is the target's time
    });

    resetCnotState();
    renderCircuit();
  }
}

// Helper to reset the CNOT placement state
function resetCnotState() {
  cnotPlacementState.isPlacing = false;
  cnotPlacementState.controlQubit = null;
  cnotPlacementState.controlTimeStep = null;
}

function placeGateVisual(g) {
  if (g.type === "CNOT") {
    // NOTE: This logic doesn't change. It correctly draws the control and target
    // in the same column (`g.time`), which is exactly what we want for the final diagram.
    const controlCell = document.querySelector(`.cell[data-q="${g.control}"][data-t="${g.time}"]`);
    const targetCell = document.querySelector(`.cell[data-q="${g.target}"][data-t="${g.time}"]`);

    if (controlCell && targetCell) {
      const control = document.createElement('div');
      control.className = 'gate-symbol cnot-control';
      const target = document.createElement('div');
      target.className = 'gate-symbol cnot-target';
      target.innerHTML = '⊕';

      addRemoveButton(control, g);
      addRemoveButton(target, g);

      controlCell.appendChild(control);
      targetCell.appendChild(target);

      const startQubit = Math.min(g.control, g.target);
      const endQubit = Math.max(g.control, g.target);
      for (let q = startQubit; q <= endQubit; q++) {
        const lineCell = document.querySelector(`.cell[data-q="${q}"][data-t="${g.time}"]`);
        if (lineCell) {
          const lineSegment = document.createElement('div');
          lineSegment.className = 'cnot-line-segment';
          lineCell.appendChild(lineSegment);
        }
      }
    }
  } else {
    // Logic for single-qubit gates
    const cell = document.querySelector(`.cell[data-q="${g.target}"][data-t="${g.time}"]`);
    if (!cell) return;
    const gateEl = document.createElement('div');
    gateEl.className = 'gate-symbol gate-placed';
    gateEl.textContent = g.type;
    addRemoveButton(gateEl, g);
    cell.appendChild(gateEl);
  }
}

function addRemoveButton(element, gateObject) {
  const remove = document.createElement('div');
  remove.className = 'remove-btn';
  remove.textContent = '×';
  remove.onclick = (e) => {
    e.stopPropagation();
    gates = gates.filter(x => x !== gateObject);
    resetCnotState(); // Ensure we're not in a weird state
    renderCircuit();
  };
  element.appendChild(remove);
}

// --- Setup Event Listeners ---
document.querySelectorAll('.gate').forEach(g => {
  g.addEventListener('dragstart', e => {
    if (cnotPlacementState.isPlacing) {
      resetCnotState();
      renderCircuit();
    }
    e.dataTransfer.setData('gate', g.dataset.gate);
  });
});

document.getElementById('add-qubit').onclick = () => {
  if (nQubits < 8) { nQubits++; renderCircuit(); }
};

document.getElementById('remove-qubit').onclick = () => {
  if (nQubits > 1) {
    nQubits--;
    gates = gates.filter(g => g.target < nQubits && (g.control === undefined || g.control < nQubits));
    renderCircuit();
  }
};

document.getElementById('simulate-btn').onclick = () => {
  const btn = document.getElementById('simulate-btn');
  btn.textContent = "Running...";
  btn.disabled = true;

  // Use setTimeout to allow UI to update
  setTimeout(() => {
    try {
      const initStates = Array.from(document.querySelectorAll('.state')).map(s => s.textContent);

      // Run JS Simulation
      const finalState = simulateCircuit(nQubits, gates, initStates);
      const results = measure(finalState, nQubits);
      const diagram = generateDiagram(nQubits, gates);

      document.getElementById('circuit-output').textContent = diagram;
      document.getElementById('results-output').textContent = JSON.stringify(results, null, 2);
    } catch (err) {
      console.error(err);
      alert("Simulation failed: " + err);
    } finally {
      btn.textContent = "▶ Run Simulation";
      btn.disabled = false;
    }
  }, 50);
};

// Initial render of the circuit
renderCircuit();
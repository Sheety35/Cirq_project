let nQubits = 3;
let timeSteps = 12; // more columns
let gates = []; // Our single source of truth for the circuit's state
const states = ["|0⟩", "|1⟩", "|+⟩", "|-⟩", "|i⟩", "|-i⟩"];

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

// Initial render of the circuit
renderCircuit();
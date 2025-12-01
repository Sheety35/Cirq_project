let nQubits = 3;
let timeSteps = 12; // more columns
let gates = []; // Our single source of truth for the circuit's state
const states = ["|0⟩", "|1⟩", "|+⟩", "|-⟩", "|i⟩", "|-i⟩"];

// --- PYODIDE SETUP ---
let pyodide = null;
let pythonCode = `
import cirq
import json

def run_simulation(json_data):
    data = json.loads(json_data)
    n_qubits = data.get("n_qubits", 3)
    gates = data.get("gates", [])
    init_states = data.get("init_states", ["|0⟩"] * n_qubits)

    qubits = [cirq.LineQubit(i) for i in range(n_qubits)]
    circuit = cirq.Circuit()

    # Initial states
    for i, s in enumerate(init_states):
        if s == "|1⟩":
            circuit.append(cirq.X(qubits[i]))
        elif s == "|+⟩":
            circuit.append(cirq.H(qubits[i]))
        elif s == "|-⟩":
            circuit.append([cirq.X(qubits[i]), cirq.H(qubits[i]), cirq.Z(qubits[i])])
        elif s == "|i⟩":
            circuit.append([cirq.H(qubits[i]), cirq.S(qubits[i])])
        elif s == "|-i⟩":
            circuit.append([cirq.H(qubits[i]), cirq.S(qubits[i])**-1])

    # Add gates
    for g in gates:
        t = g["type"]
        q = g["target"]
        if t == "CNOT":
            circuit.append(cirq.CNOT(qubits[g["control"]], qubits[q]))
        elif t == "H":
            circuit.append(cirq.H(qubits[q]))
        elif t == "X":
            circuit.append(cirq.X(qubits[q]))
        elif t == "Y":
            circuit.append(cirq.Y(qubits[q]))
        elif t == "Z":
            circuit.append(cirq.Z(qubits[q]))
        elif t == "S":
            circuit.append(cirq.S(qubits[q]))
        elif t == "T":
            circuit.append(cirq.T(qubits[q]))

    circuit.append(cirq.measure(*qubits, key='m'))
    sim = cirq.Simulator()
    result = sim.run(circuit, repetitions=500)
    counts = dict(result.multi_measurement_histogram(keys=['m']))
    formatted = {''.join(map(str, k)): v for k, v in counts.items()}
    
    return json.dumps({"diagram": circuit.to_text_diagram(transpose=True), "results": formatted})
`;

async function initPyodide() {
    const btn = document.getElementById('simulate-btn');
    try {
        pyodide = await loadPyodide();
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        btn.textContent = "Installing Cirq...";
        await micropip.install("cirq-core");
        // Run the definition code once
        await pyodide.runPythonAsync(pythonCode);
        
        btn.textContent = "▶ Run Simulation";
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        btn.textContent = "Error loading Pyodide";
    }
}
initPyodide();


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
  if (!pyodide) return;
  
  const btn = document.getElementById('simulate-btn');
  const originalText = btn.textContent;
  btn.textContent = "Running...";
  btn.disabled = true;

  try {
      const initStates = Array.from(document.querySelectorAll('.state')).map(s => s.textContent);
      const inputData = JSON.stringify({ n_qubits: nQubits, gates, init_states: initStates });
      
      // Call the Python function
      // We use runPython to call the function we defined earlier
      // We need to pass the argument. A simple way is to set a variable.
      pyodide.globals.set("input_json", inputData);
      const resultJson = await pyodide.runPythonAsync("run_simulation(input_json)");
      
      const data = JSON.parse(resultJson);
      document.getElementById('circuit-output').textContent = data.diagram;
      document.getElementById('results-output').textContent = JSON.stringify(data.results, null, 2);
  } catch (err) {
      console.error(err);
      alert("Simulation failed: " + err);
  } finally {
      btn.textContent = originalText;
      btn.disabled = false;
  }
};

// Initial render of the circuit
renderCircuit();
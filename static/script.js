let gates = [];  // store placed gates

document.querySelectorAll('.gate').forEach(btn => {
  btn.addEventListener('click', () => {
    const gtype = btn.dataset.gate;
    const qline = prompt("Place on which qubit? (0 or 1)");
    if (qline === null) return;
    gates.push({type: gtype, target: parseInt(qline)});
    alert(`Added ${gtype} on qubit ${qline}`);
  });
});

document.getElementById('simulate-btn').addEventListener('click', async () => {
  const response = await fetch('/simulate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({n_qubits: 2, gates})
  });
  const data = await response.json();
  document.getElementById('circuit-output').textContent = data.circuit;
  document.getElementById('results-output').textContent = JSON.stringify(data.counts, null, 2);
});

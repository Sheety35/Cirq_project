from flask import Flask, render_template, request, jsonify
import cirq

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json()
    n_qubits = data.get("n_qubits", 2)
    gates = data.get("gates", [])

    qubits = [cirq.LineQubit(i) for i in range(n_qubits)]
    circuit = cirq.Circuit()

    for gate in gates:
        gtype = gate.get("type")
        q = gate.get("target")
        if gtype == "H":
            circuit.append(cirq.H(qubits[q]))
        elif gtype == "X":
            circuit.append(cirq.X(qubits[q]))
        elif gtype == "CNOT":
            control = gate.get("control")
            circuit.append(cirq.CNOT(qubits[control], qubits[q]))

    circuit.append(cirq.measure(*qubits, key='final'))

    simulator = cirq.Simulator()
    result = simulator.run(circuit, repetitions=500)
    raw_counts = result.multi_measurement_histogram(keys=['final'])
    counts = { ''.join(map(str, bits)): freq for bits, freq in raw_counts.items() }

    return jsonify({
        "circuit": circuit.to_text_diagram(transpose=True),
        "counts": counts
    })

if __name__ == "__main__":
    app.run(debug=True)

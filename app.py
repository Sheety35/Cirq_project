from flask import Flask, render_template, request, jsonify
import cirq

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json()
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

    # Add gates from grid
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
    return jsonify({"diagram": circuit.to_text_diagram(transpose=True), "results": formatted})

if __name__ == "__main__":
    app.run(debug=True)

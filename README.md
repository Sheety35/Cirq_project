# ⚛️ Quantum Circuit Builder

An interactive web-based quantum circuit visualizer built with Google's Cirq framework. This application allows users to design, visualize, and simulate quantum circuits through an intuitive drag-and-drop interface.

![Quantum Circuit Builder](https://img.shields.io/badge/quantum-computing-blue)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/flask-2.0+-green.svg)
![Cirq](https://img.shields.io/badge/cirq-latest-orange.svg)

## 🌟 Features

- **Interactive Circuit Design**: Drag-and-drop interface for placing quantum gates
- **Multiple Quantum Gates**: Support for H, X, Y, Z, S, T, and CNOT gates
- **Flexible Qubit Management**: Add or remove qubits dynamically (1-8 qubits)
- **Initial State Configuration**: Set initial qubit states (|0⟩, |1⟩, |+⟩, |-⟩, |i⟩, |-i⟩)
- **Real-time Simulation**: Run quantum simulations with 500 repetitions
- **Visual Circuit Diagram**: See your circuit rendered as a text diagram
- **Measurement Results**: View probability distribution of measurement outcomes
- **Intuitive CNOT Placement**: Two-step process for placing controlled gates
- **Gate Removal**: Easy gate deletion with hover-to-remove functionality

## 🎯 How It Works

### Single-Qubit Gates
1. Drag a gate (H, X, Y, Z, S, T) from the toolbox
2. Drop it onto any cell in the circuit grid
3. Hover over placed gates to reveal the remove button (×)

### CNOT Gates
1. Drag the CNOT gate from the toolbox
2. Drop it on the **control** qubit's desired time step (an orange glowing dot appears)
3. Click on the **target** qubit at the desired time step to complete the gate
4. Click the pending control dot to cancel the placement

### Initial States
- Click on any qubit's initial state label to cycle through available states
- States: |0⟩ (default), |1⟩, |+⟩, |-⟩, |i⟩, |-i⟩

### Simulation
- Click "▶ Run Simulation" to execute the circuit
- View the circuit diagram and measurement results below

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/simple-cirq-visualizer.git
cd simple-cirq-visualizer
```

2. **Create a virtual environment (recommended)**
```bash
python -m venv env
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

### Running Locally

```bash
python app.py
```

The application will start on `http://127.0.0.1:5000/`. Open this URL in your web browser.

## 📁 Project Structure

```
simple-cirq-visualizer/
│
├── app.py                  # Flask backend with Cirq simulation logic
├── requirements.txt        # Python dependencies
├── Procfile               # Deployment configuration for Heroku/Gunicorn
│
├── templates/
│   └── index.html         # Main HTML template
│
└── static/
    ├── script.js          # Frontend logic (drag-and-drop, state management)
    └── style.css          # Styling and visual design
```

## 🔧 Technical Details

### Backend (`app.py`)
- **Framework**: Flask
- **Quantum Library**: Google Cirq
- **Endpoints**:
  - `GET /`: Serves the main application
  - `POST /simulate`: Accepts circuit configuration and returns simulation results

### Frontend
- **Pure JavaScript**: No frameworks, vanilla JS for maximum compatibility
- **Drag-and-Drop API**: Native HTML5 drag-and-drop
- **State Management**: Single source of truth for circuit state
- **Responsive Design**: Clean, modern UI with flexbox layout

### Quantum Gates Supported

| Gate | Description | Matrix Representation |
|------|-------------|----------------------|
| **H** | Hadamard | Creates superposition |
| **X** | Pauli-X | Quantum NOT gate |
| **Y** | Pauli-Y | Rotation around Y-axis |
| **Z** | Pauli-Z | Phase flip |
| **S** | Phase gate | √Z gate |
| **T** | π/8 gate | Fourth root of Z |
| **CNOT** | Controlled-NOT | Two-qubit entangling gate |

## 🎨 User Interface

The interface is divided into four main sections:

1. **Controls**: Add/remove qubits and run simulations
2. **Toolbox**: Draggable quantum gates
3. **Circuit Grid**: Interactive circuit design area with qubit wires
4. **Output**: Circuit diagram and measurement results

### Visual Feedback
- **Drag-over highlighting**: Cells highlight when dragging gates
- **Pending CNOT indicator**: Orange glowing dot for incomplete CNOT placement
- **Hover-to-remove**: Delete buttons appear on hover
- **Color-coded gates**: Different colors for single-qubit vs. CNOT gates

## 🌐 Deployment

### Deploy to Heroku

1. **Install Heroku CLI** and login
```bash
heroku login
```

2. **Create a new Heroku app**
```bash
heroku create your-app-name
```

3. **Deploy**
```bash
git push heroku main
```

The `Procfile` is already configured to use Gunicorn as the production server.

### Deploy to Other Platforms

The application can be deployed to any platform that supports Python Flask applications:
- **Railway**: Connect your GitHub repo
- **Render**: Use the web service option
- **PythonAnywhere**: Upload files and configure WSGI
- **Google Cloud Run**: Containerize with Docker

## 🧪 Example Circuits

### Bell State (Entanglement)
1. Start with 2 qubits
2. Place H gate on qubit 0 at time 0
3. Place CNOT with control=0, target=1 at time 1
4. Run simulation → Results show 50% |00⟩ and 50% |11⟩

### Quantum Teleportation
1. Use 3 qubits
2. Create Bell pair between qubits 1 and 2
3. Apply gates to qubit 0 (state to teleport)
4. Entangle qubit 0 with qubit 1
5. Measure and apply corrections

## 🤝 Contributing

Contributions are welcome! Here are some ideas for enhancements:

- [ ] Add more quantum gates (Rx, Ry, Rz, SWAP, Toffoli)
- [ ] Export circuits to QASM or Cirq code
- [ ] Save/load circuit designs
- [ ] Statevector visualization
- [ ] Bloch sphere representation
- [ ] Multi-qubit gate support
- [ ] Circuit optimization suggestions
- [ ] Dark mode toggle

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Google Cirq**: Quantum computing framework
- **Flask**: Lightweight web framework
- **Quantum Computing Community**: For inspiration and resources

## 📧 Contact

For questions, suggestions, or feedback, please open an issue on GitHub.

---

**Built with ❤️ for quantum computing enthusiasts**

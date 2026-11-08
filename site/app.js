const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/";
const CANTERA_WHEEL_MANIFEST = "./assets/cantera-wheel.json";

const mechanisms = {
  methane: {
    file: "./assets/mechanisms/gri30.yaml",
    phase: "gri30",
    fuel: "CH4:1",
    label: "Methane, CH₄ + air · GRI-Mech 3.0",
    expectedProducts: ["CO2", "H2O", "CO", "H2", "O2", "N2"]
  },
  jetA: {
    file: "./assets/mechanisms/A2highT_nox.yaml",
    phase: "gas",
    fuel: "POSF10325:1",
    label: "Jet-A, POSF10325 + air · HyChem with UCSD NOx",
    expectedProducts: ["NO", "NO2", "CO2", "H2O", "CO", "H2"]
  }
};

const form = document.querySelector("#calculator");
const fuelSelect = document.querySelector("#fuel");
const calculateButton = document.querySelector("#calculate");
const engineStatus = document.querySelector("#engine-status");
const mechanismDescription = document.querySelector("#mechanism-description");
const resultTemperature = document.querySelector("#result-temperature");
const resultPhi = document.querySelector("#result-phi");
const flowSummary = document.querySelector("#flow-summary");
const speciesElement = document.querySelector("#species");
const emptySpecies = document.querySelector("#no-results");
const mixtureMode = document.querySelector("#mixture-mode");
const equivalenceFields = document.querySelector("#equivalence-fields");
const flowFields = document.querySelector("#flow-fields");
const densityField = document.querySelector("#liquid-density-field");
const flowHint = document.querySelector("#flow-hint");

const massUnits = [
  ["kg/s", 1], ["kg/min", 1 / 60], ["kg/h", 1 / 3600],
  ["g/s", 0.001], ["g/min", 0.001 / 60],
  ["lbm/s", 0.45359237], ["lbm/min", 0.45359237 / 60], ["lbm/h", 0.45359237 / 3600]
];
const volumeUnits = [
  ["mL/min", 1e-6 / 60], ["L/min", 0.001 / 60], ["L/s", 0.001],
  ["m³/s", 1], ["m³/h", 1 / 3600], ["ft³/min (cfm)", 0.028316846592 / 60],
  ["US gal/min", 0.003785411784 / 60]
];

let pyodide;
let activeMode = mixtureMode.value;

function populateUnits(select, units, desired) {
  const previous = select.value;
  select.replaceChildren(...units.map(([name]) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    return option;
  }));
  select.value = units.some(([name]) => name === previous) ? previous : desired;
  select.dataset.previousUnit = select.value;
}

function idealGasDensity(stream) {
  const temperature = Number(document.querySelector("#temperature").value);
  const pressure = Number(document.querySelector("#pressure").value) * 1000;
  const molecularWeight = stream === "fuel" ? 0.01604246 : 0.028850334;
  return pressure * molecularWeight / (8.314462618 * temperature);
}

function liquidFuelDensity() {
  return Number(document.querySelector("#liquid-density").value) || 800;
}

function massFlowFromInput(stream, mode) {
  const value = Number(document.querySelector(`#${stream}-flow`).value) || 0;
  const unit = document.querySelector(`#${stream}-flow-unit`).value;
  const units = mode === "volume" ? volumeUnits : massUnits;
  const factor = units.find(([name]) => name === unit)?.[1] ?? 1;
  if (mode === "mass") return value * factor;
  const density = stream === "fuel" && fuelSelect.value === "jetA" ? liquidFuelDensity() : idealGasDensity(stream);
  return value * factor * density;
}

function defaultMassFlows() {
  return { fuel: 1, air: fuelSelect.value === "jetA" ? 14.7 : 17.2 };
}

function setFlowFromMass(stream, massFlow, mode) {
  const unitSelect = document.querySelector(`#${stream}-flow-unit`);
  const unitList = mode === "volume" ? volumeUnits : massUnits;
  const factor = unitList.find(([name]) => name === unitSelect.value)?.[1] ?? 1;
  let baseRate = massFlow;
  if (mode === "volume") {
    const density = stream === "fuel" && fuelSelect.value === "jetA" ? liquidFuelDensity() : idealGasDensity(stream);
    baseRate /= density;
  }
  document.querySelector(`#${stream}-flow`).value = String(baseRate / factor);
}

function updateInputMode(resetFuelDefaults = false) {
  const mode = mixtureMode.value;
  const usesFlow = mode !== "equivalence";
  const oldMassFlows = resetFuelDefaults || activeMode === "equivalence"
    ? defaultMassFlows()
    : {
        fuel: massFlowFromInput("fuel", activeMode),
        air: massFlowFromInput("air", activeMode)
      };
  equivalenceFields.hidden = usesFlow;
  flowFields.hidden = !usesFlow;
  document.querySelector("#phi").disabled = usesFlow;
  document.querySelector("#fuel-flow").disabled = !usesFlow;
  document.querySelector("#air-flow").disabled = !usesFlow;
  document.querySelector("#fuel-flow-unit").disabled = !usesFlow;
  document.querySelector("#air-flow-unit").disabled = !usesFlow;
  const units = mode === "volume" ? volumeUnits : massUnits;
  const preferred = mode === "volume" ? "L/min" : "kg/s";
  populateUnits(document.querySelector("#fuel-flow-unit"), units, preferred);
  populateUnits(document.querySelector("#air-flow-unit"), units, preferred);
  if (usesFlow) {
    setFlowFromMass("fuel", oldMassFlows.fuel, mode);
    setFlowFromMass("air", oldMassFlows.air, mode);
  }
  const liquidJetA = usesFlow && mode === "volume" && fuelSelect.value === "jetA";
  densityField.hidden = !liquidJetA;
  document.querySelector("#liquid-density").disabled = !liquidJetA;
  flowHint.textContent = mode === "volume"
    ? "Gas flow is evaluated at the entered temperature and pressure. Jet-A uses the editable liquid density."
    : "Fuel and air are converted to kg/s before calculating equivalence ratio.";
  activeMode = mode;
}

populateUnits(document.querySelector("#fuel-flow-unit"), massUnits, "kg/s");
populateUnits(document.querySelector("#air-flow-unit"), massUnits, "kg/s");
for (const stream of ["fuel", "air"]) {
  const unitSelect = document.querySelector(`#${stream}-flow-unit`);
  unitSelect.addEventListener("change", () => {
    const mode = mixtureMode.value;
    const unitList = mode === "volume" ? volumeUnits : massUnits;
    const oldFactor = unitList.find(([name]) => name === unitSelect.dataset.previousUnit)?.[1] ?? 1;
    const newFactor = unitList.find(([name]) => name === unitSelect.value)?.[1] ?? 1;
    const input = document.querySelector(`#${stream}-flow`);
    input.value = String(Number(input.value) * oldFactor / newFactor);
    unitSelect.dataset.previousUnit = unitSelect.value;
  });
}
mixtureMode.addEventListener("change", () => updateInputMode());

fuelSelect.addEventListener("change", () => {
  mechanismDescription.textContent = mechanisms[fuelSelect.value].label;
  updateInputMode(true);
});

async function loadEngine() {
  try {
    const { loadPyodide } = await import(`${PYODIDE_BASE}pyodide.mjs`);
    pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
    await pyodide.loadPackage("micropip");
    const wheelManifestResponse = await fetch(CANTERA_WHEEL_MANIFEST);
    if (!wheelManifestResponse.ok) throw new Error("The Cantera WebAssembly package could not be located.");
    const wheelManifest = await wheelManifestResponse.json();
    const wheelUrl = new URL(`./assets/${wheelManifest.file}`, location.href).href;
    await pyodide.runPythonAsync(`import micropip\nawait micropip.install("${wheelUrl}")`);
    await pyodide.runPythonAsync(PYTHON_CALCULATE);
    calculateButton.disabled = false;
    calculateButton.textContent = "Calculate Flame Temperature";
    engineStatus.textContent = "Chemistry engine ready. Your inputs stay in this browser.";
  } catch (error) {
    engineStatus.textContent = error.message || "Unable to start the browser chemistry engine.";
    calculateButton.textContent = "Engine unavailable";
    console.error(error);
  }
}

const PYTHON_CALCULATE = `
import cantera as ct
import json

def calculate(payload):
    gas = ct.Solution(payload["mechanism_path"], payload["phase"])
    temperature = payload["temperature_k"]
    pressure = payload["pressure_pa"]
    fuel = payload["fuel"]
    oxidizer = "O2:1,N2:3.76"
    equivalence_ratio = payload["phi"]
    fuel_mass_flow = None
    air_mass_flow = None
    if payload["mode"] != "equivalence":
        air_fuel_ratio_stoich = gas.stoich_air_fuel_ratio(fuel, oxidizer, basis="mole")
        if payload["mode"] == "mass":
            fuel_mass_flow = payload["fuel_flow"] * payload["fuel_unit_factor"]
            air_mass_flow = payload["air_flow"] * payload["air_unit_factor"]
        else:
            fuel_volume_flow = payload["fuel_flow"] * payload["fuel_unit_factor"]
            air_volume_flow = payload["air_flow"] * payload["air_unit_factor"]
            if payload["fuel_kind"] == "jetA":
                fuel_density = payload["liquid_density"]
            else:
                gas.TPX = temperature, pressure, fuel
                fuel_density = gas.density
            gas.TPX = temperature, pressure, oxidizer
            air_density = gas.density
            fuel_mass_flow = fuel_volume_flow * fuel_density
            air_mass_flow = air_volume_flow * air_density
        if fuel_mass_flow <= 0 or air_mass_flow <= 0:
            raise ValueError("Fuel and air flow rates must be greater than zero.")
        equivalence_ratio = (fuel_mass_flow / air_mass_flow) * air_fuel_ratio_stoich
        if equivalence_ratio <= 0 or equivalence_ratio > 10:
            raise ValueError("The resulting equivalence ratio must be greater than zero and no more than 10.")
    gas.TP = temperature, pressure
    gas.set_equivalence_ratio(equivalence_ratio, fuel, oxidizer)
    gas.equilibrate("HP")
    products = {}
    for name in payload["product_species"]:
        try:
            products[name] = float(gas.X[gas.species_index(name)])
        except Exception:
            continue
    return json.dumps({"temperature_k": float(gas.T), "phi": float(equivalence_ratio), "fuel_mass_flow": fuel_mass_flow, "air_mass_flow": air_mass_flow, "products": products})
`;

function renderResult(result) {
  resultTemperature.textContent = Number(result.temperature_k).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  resultPhi.textContent = Number(result.phi).toFixed(4);
  flowSummary.textContent = result.fuel_mass_flow == null
    ? ""
    : `Equivalent flows: fuel ${Number(result.fuel_mass_flow).toPrecision(5)} kg/s · air ${Number(result.air_mass_flow).toPrecision(5)} kg/s`;
  speciesElement.replaceChildren();
  const entries = Object.entries(result.products ?? {}).filter(([, fraction]) => fraction > 1e-8);
  for (const [name, fraction] of entries) {
    const label = document.createElement("dt");
    label.textContent = name;
    const value = document.createElement("dd");
    value.textContent = fraction.toExponential(3);
    speciesElement.append(label, value);
  }
  emptySpecies.hidden = entries.length > 0;
  speciesElement.hidden = entries.length === 0;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!pyodide || !form.reportValidity()) return;
  const selected = mechanisms[fuelSelect.value];
  calculateButton.disabled = true;
  calculateButton.textContent = "Calculating…";
  engineStatus.textContent = "Running Cantera equilibrium in this browser…";
  try {
    const response = await fetch(selected.file);
    if (!response.ok) throw new Error("The selected mechanism file could not be loaded.");
    const yaml = await response.text();
    pyodide.FS.writeFile("/tmp/flameaid-mechanism.yaml", yaml);
    const mode = mixtureMode.value;
    const units = mode === "volume" ? volumeUnits : massUnits;
    const fuelFlowUnit = document.querySelector("#fuel-flow-unit").value;
    const airFlowUnit = document.querySelector("#air-flow-unit").value;
    pyodide.globals.set("payload_json", JSON.stringify({
      mechanism_path: "/tmp/flameaid-mechanism.yaml",
      phase: selected.phase,
      fuel: selected.fuel,
      fuel_kind: fuelSelect.value,
      mode,
      phi: mode === "equivalence" ? Number(document.querySelector("#phi").value) : 1,
      fuel_flow: Number(document.querySelector("#fuel-flow").value),
      air_flow: Number(document.querySelector("#air-flow").value),
      fuel_unit_factor: units.find(([name]) => name === fuelFlowUnit)[1],
      air_unit_factor: units.find(([name]) => name === airFlowUnit)[1],
      liquid_density: Number(document.querySelector("#liquid-density").value),
      temperature_k: Number(document.querySelector("#temperature").value),
      pressure_pa: Number(document.querySelector("#pressure").value) * 1000,
      product_species: selected.expectedProducts
    }));
    pyodide.runPython(`import json\n_payload = json.loads(payload_json)`);
    const jsonText = pyodide.runPython("calculate(_payload)");
    renderResult(JSON.parse(jsonText));
    engineStatus.textContent = "Calculation complete. Computed locally with Cantera.";
  } catch (error) {
    engineStatus.textContent = error.message || "The equilibrium calculation failed.";
    console.error(error);
  } finally {
    calculateButton.disabled = false;
    calculateButton.textContent = "Calculate Flame Temperature";
  }
});

updateInputMode();
loadEngine();

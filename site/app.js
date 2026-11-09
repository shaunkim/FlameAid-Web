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
    expectedProducts: ["CO2", "H2O", "CO", "H2", "O2", "N2", "NO", "NO2"]
  }
};
const blendSpecies = [
  ["H2", "Hydrogen · H₂"], ["CO", "Carbon monoxide · CO"], ["CH4", "Methane · CH₄"],
  ["C2H2", "Acetylene · C₂H₂"], ["C2H4", "Ethylene · C₂H₄"], ["C2H6", "Ethane · C₂H₆"],
  ["C3H8", "Propane · C₃H₈"], ["CH3OH", "Methanol · CH₃OH"], ["NH3", "Ammonia · NH₃"],
  ["CO2", "Carbon dioxide · CO₂"], ["N2", "Nitrogen · N₂"], ["H2O", "Water · H₂O"],
  ["O2", "Oxygen · O₂"], ["AR", "Argon · Ar"]
];

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
const availabilityDialog = document.querySelector("#app-availability");
const availabilityCalculator = document.querySelector("#availability-calculator");
const calculatorTabs = [...document.querySelectorAll(".calculator-tab[data-calculator]")];
const aftView = document.querySelector("#aft-view");
const blendView = document.querySelector("#fuel-blends-view");
const mixtureModeField = document.querySelector("#mixture-mode-field");
const customFuelOption = document.querySelector("#custom-fuel-option");
const blendForm = document.querySelector("#fuel-blend-calculator");
const blendRowsElement = document.querySelector("#blend-rows");
const blendTotalElement = document.querySelector("#blend-total");
const blendStatus = document.querySelector("#blend-status");
const computePropertiesButton = document.querySelector("#compute-properties");
const blendPropertiesElement = document.querySelector("#blend-properties");
const blendPropertiesEmpty = document.querySelector("#blend-properties-empty");
const blendPhi = document.querySelector("#blend-phi");
const blendPhiValue = document.querySelector("#blend-phi-value");
const calculateBlendAFTButton = document.querySelector("#calculate-blend-aft");
const blendAFTResultElement = document.querySelector("#blend-aft-result");
const blendAFTStatus = document.querySelector("#blend-aft-status");
const blendTemperature = document.querySelector("#blend-temperature");
const blendPressure = document.querySelector("#blend-pressure");

document.querySelectorAll(".app-only-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    availabilityCalculator.textContent = tab.dataset.calculator;
    availabilityDialog.showModal();
  });
});
calculatorTabs.filter((tab) => !tab.classList.contains("app-only-tab")).forEach((tab) => {
  tab.addEventListener("click", () => showCalculator(tab.dataset.calculator));
});
document.querySelector("#close-availability").addEventListener("click", () => availabilityDialog.close());
availabilityDialog.addEventListener("click", (event) => {
  if (event.target === availabilityDialog) availabilityDialog.close();
});

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
const DEFAULT_MASS_FLOW_UNIT = "kg/s";

let pyodide;
let activeMode = mixtureMode.value;
let modeBeforeCustomBlend = "mass";
let blendInputRevision = 0;
let computedBlendRevision = -1;
let computedFuelComposition = null;

function showCalculator(name) {
  const isBlend = name === "fuel-blends";
  aftView.hidden = isBlend;
  blendView.hidden = !isBlend;
  aftView.classList.toggle("active", !isBlend);
  blendView.classList.toggle("active", isBlend);
  for (const tab of calculatorTabs) {
    const selected = tab.dataset.calculator === name;
    tab.classList.toggle("active", selected);
    if (selected) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  if (isBlend) blendRowsElement.querySelector("input, select")?.focus({ preventScroll: true });
}

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
  const customFuelSelected = fuelSelect.value === "custom";
  const mode = customFuelSelected ? "equivalence" : mixtureMode.value;
  const usesFlow = !customFuelSelected && mode !== "equivalence";
  const oldMassFlows = resetFuelDefaults || activeMode === "equivalence"
    ? defaultMassFlows()
    : {
        fuel: massFlowFromInput("fuel", activeMode),
        air: massFlowFromInput("air", activeMode)
      };
  equivalenceFields.hidden = usesFlow;
  flowFields.hidden = !usesFlow;
  mixtureModeField.hidden = customFuelSelected;
  mixtureMode.disabled = customFuelSelected;
  document.querySelector("#phi").disabled = usesFlow;
  document.querySelector("#fuel-flow").disabled = !usesFlow;
  document.querySelector("#air-flow").disabled = !usesFlow;
  document.querySelector("#fuel-flow-unit").disabled = !usesFlow;
  document.querySelector("#air-flow-unit").disabled = !usesFlow;
  const units = mode === "volume" ? volumeUnits : massUnits;
  const preferred = mode === "volume" ? "L/min" : DEFAULT_MASS_FLOW_UNIT;
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

populateUnits(document.querySelector("#fuel-flow-unit"), massUnits, DEFAULT_MASS_FLOW_UNIT);
populateUnits(document.querySelector("#air-flow-unit"), massUnits, DEFAULT_MASS_FLOW_UNIT);
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
mixtureMode.addEventListener("change", () => {
  if (fuelSelect.value !== "custom") modeBeforeCustomBlend = mixtureMode.value;
  updateInputMode();
});

fuelSelect.dataset.previousFuel = fuelSelect.value;
fuelSelect.addEventListener("change", () => {
  const previousFuel = fuelSelect.dataset.previousFuel;
  if (fuelSelect.value === "custom") {
    if (previousFuel !== "custom") modeBeforeCustomBlend = mixtureMode.value;
    mixtureMode.value = "equivalence";
  } else if (previousFuel === "custom") {
    mixtureMode.value = modeBeforeCustomBlend;
  }
  fuelSelect.dataset.previousFuel = fuelSelect.value;
  mechanismDescription.textContent = fuelSelect.value === "custom"
    ? "Custom gas blend + air · GRI-Mech 3.0"
    : mechanisms[fuelSelect.value].label;
  updateInputMode(true);
  updateAFTAvailability();
});

function updateAFTAvailability() {
  const customIsFresh = fuelSelect.value !== "custom"
    || (computedFuelComposition && computedBlendRevision === blendInputRevision);
  calculateButton.disabled = !pyodide || !customIsFresh;
  if (fuelSelect.value === "custom" && !customIsFresh) {
    engineStatus.textContent = "Blend inputs changed. Recompute fuel properties before using this blend in AFT.";
  }
  calculateBlendAFTButton.disabled = !pyodide
    || !computedFuelComposition
    || computedBlendRevision !== blendInputRevision;
  blendPhi.disabled = calculateBlendAFTButton.disabled;
}

function invalidateBlendResults() {
  blendInputRevision += 1;
  computedBlendRevision = -1;
  blendPropertiesElement.hidden = true;
  blendPropertiesEmpty.hidden = false;
  blendPropertiesEmpty.textContent = "Inputs changed. Recompute fuel properties before using this blend.";
  customFuelOption.disabled = true;
  blendAFTResultElement.innerHTML = "— <span>K</span>";
  blendAFTStatus.textContent = "Blend inputs changed. Recompute fuel properties before calculating AFT.";
  updateAFTAvailability();
}

function updateBlendTotal() {
  const values = [...blendRowsElement.querySelectorAll(".blend-row input")]
    .map((input) => Number(input.value) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  blendTotalElement.textContent = `Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function updateBlendSpeciesOptions() {
  const selects = [...blendRowsElement.querySelectorAll(".blend-row select")];
  for (const select of selects) {
    const current = select.value;
    const usedElsewhere = new Set(selects.filter((other) => other !== select).map((other) => other.value).filter(Boolean));
    select.replaceChildren(new Option("Select species", ""));
    for (const [name, label] of blendSpecies) {
      if (name === current || !usedElsewhere.has(name)) select.add(new Option(label, name));
    }
    select.value = current;
  }
  document.querySelector("#add-species").disabled = selects.length >= blendSpecies.length;
}

function addBlendRow(species = "", molarParts = 0) {
  const row = document.createElement("div");
  row.className = "blend-row";
  const speciesLabel = document.createElement("label");
  speciesLabel.className = "field";
  speciesLabel.append(document.createTextNode("Species"));
  const speciesSelect = document.createElement("select");
  speciesSelect.setAttribute("aria-label", "Blend species");
  speciesSelect.required = true;
  speciesLabel.append(speciesSelect);
  const amountLabel = document.createElement("label");
  amountLabel.className = "field";
  amountLabel.append(document.createTextNode("Molar parts"));
  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "any";
  amountInput.required = true;
  amountInput.value = String(molarParts);
  amountInput.setAttribute("aria-label", `${species || "Blend"} molar parts`);
  amountLabel.append(amountInput);
  const removeButton = document.createElement("button");
  removeButton.className = "remove-species";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", "Remove species");
  row.append(speciesLabel, amountLabel, removeButton);
  blendRowsElement.append(row);
  speciesSelect.addEventListener("change", () => {
    updateBlendSpeciesOptions();
    invalidateBlendResults();
  });
  amountInput.addEventListener("input", () => {
    amountInput.setCustomValidity("");
    updateBlendTotal();
    invalidateBlendResults();
  });
  removeButton.addEventListener("click", () => {
    row.remove();
    updateBlendSpeciesOptions();
    updateBlendTotal();
    invalidateBlendResults();
  });
  updateBlendSpeciesOptions();
  speciesSelect.value = species;
  updateBlendSpeciesOptions();
}

function readBlendPayload() {
  if (!blendForm.reportValidity()) return null;
  const rows = [...blendRowsElement.querySelectorAll(".blend-row")].map((row) => ({
    species: row.querySelector("select").value,
    molarParts: Number(row.querySelector("input").value)
  }));
  if (rows.some((row) => !Number.isFinite(row.molarParts) || row.molarParts < 0)) {
    throw new Error("Molar parts must be finite values at or above zero.");
  }
  if (rows.some((row) => !row.species && row.molarParts > 0)) {
    throw new Error("Choose a species for each row with positive molar parts.");
  }
  const total = rows.reduce((sum, row) => sum + row.molarParts, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Enter a positive total of molar parts.");
  return {
    rows,
    temperature_k: Number(blendTemperature.value),
    pressure_pa: Number(blendPressure.value) * 1000,
    mechanism_path: "/tmp/flameaid-gri30.yaml",
    phase: "gri30"
  };
}

function formatDecimal(value, digits = 4) {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function renderBlendProperties(properties) {
  const rows = [
    ["Lower heating value", `${formatDecimal(properties.lhv_j_per_kg / 1e6, 3)} MJ/kg`],
    ["Higher heating value", `${formatDecimal(properties.hhv_j_per_kg / 1e6, 3)} MJ/kg`],
    ["Density", `${formatDecimal(properties.density_kg_per_m3, 4)} kg/m³`],
    ["Dynamic viscosity", `${Number(properties.dynamic_viscosity_pa_s).toExponential(4)} Pa·s`],
    ["Kinematic viscosity", `${Number(properties.kinematic_viscosity_m2_per_s).toExponential(4)} m²/s`],
    ["Mean molecular weight", `${formatDecimal(properties.mean_molecular_weight_kg_per_kmol, 3)} kg/kmol`],
    ["Specific gravity", formatDecimal(properties.specific_gravity, 4)],
    ["cp", `${formatDecimal(properties.cp_j_per_kg_k / 1000, 4)} kJ/(kg·K)`],
    ["cv", `${formatDecimal(properties.cv_j_per_kg_k / 1000, 4)} kJ/(kg·K)`],
    ["γ", formatDecimal(properties.gamma, 4)],
    ["Thermal conductivity", `${formatDecimal(properties.thermal_conductivity_w_per_mk, 5)} W/(m·K)`],
    ["Stoichiometric air/fuel ratio", `${formatDecimal(properties.stoich_air_fuel_ratio, 4)} kg/kg`]
  ];
  blendPropertiesElement.replaceChildren();
  for (const [name, value] of rows) {
    const label = document.createElement("dt");
    label.textContent = name;
    const result = document.createElement("dd");
    result.textContent = value;
    blendPropertiesElement.append(label, result);
  }
  blendPropertiesEmpty.hidden = true;
  blendPropertiesElement.hidden = false;
}

function runPythonJson(functionName, payload) {
  pyodide.globals.set("payload_json", JSON.stringify(payload));
  pyodide.runPython(`import json\n_payload = json.loads(payload_json)`);
  return JSON.parse(pyodide.runPython(`${functionName}(_payload)`));
}

document.querySelector("#add-species").addEventListener("click", () => {
  const used = new Set([...blendRowsElement.querySelectorAll("select")].map((select) => select.value));
  const nextSpecies = blendSpecies.find(([name]) => !used.has(name))?.[0] ?? "";
  addBlendRow(nextSpecies, 0);
  invalidateBlendResults();
});

for (const input of [blendTemperature, blendPressure]) {
  input.addEventListener("input", invalidateBlendResults);
}

blendPhi.addEventListener("input", () => {
  blendPhiValue.value = Number(blendPhi.value).toFixed(2);
  blendPhiValue.textContent = Number(blendPhi.value).toFixed(2);
});

computePropertiesButton.addEventListener("click", () => {
  try {
    const payload = readBlendPayload();
    if (!payload) return;
    computePropertiesButton.disabled = true;
    blendStatus.textContent = "Computing fuel properties locally with Cantera…";
    const result = runPythonJson("calculate_blend_properties", payload);
    computedFuelComposition = result.normalized_fuel;
    computedBlendRevision = blendInputRevision;
    customFuelOption.hidden = false;
    customFuelOption.disabled = false;
    renderBlendProperties(result);
    blendStatus.textContent = "Fuel properties calculated locally with Cantera. This blend is ready for AFT.";
    updateAFTAvailability();
  } catch (error) {
    blendStatus.textContent = error.message || "Unable to calculate fuel properties.";
    console.error(error);
  } finally {
    computePropertiesButton.disabled = !pyodide;
  }
});

calculateBlendAFTButton.addEventListener("click", () => {
  if (!computedFuelComposition || computedBlendRevision !== blendInputRevision) {
    blendAFTStatus.textContent = "Compute fuel properties before calculating AFT.";
    return;
  }
  try {
    calculateBlendAFTButton.disabled = true;
    blendAFTStatus.textContent = "Running Cantera equilibrium locally…";
    const result = runPythonJson("calculate_blend_aft", {
      mechanism_path: "/tmp/flameaid-gri30.yaml",
      phase: "gri30",
      fuel: computedFuelComposition,
      phi: Number(blendPhi.value),
      temperature_k: Number(blendTemperature.value),
      pressure_pa: Number(blendPressure.value) * 1000
    });
    blendAFTResultElement.innerHTML = `${formatDecimal(result.temperature_k, 2)} <span>K</span>`;
    blendAFTStatus.textContent = `Adiabatic flame temperature calculated at φ ${Number(result.phi).toFixed(2)}.`;
  } catch (error) {
    blendAFTStatus.textContent = error.message || "The equilibrium calculation failed.";
    console.error(error);
  } finally {
    updateAFTAvailability();
  }
});

addBlendRow("H2", 50);
addBlendRow("CO", 50);
addBlendRow("CH4", 0);
updateBlendTotal();

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
    const gri30Response = await fetch(mechanisms.methane.file);
    if (!gri30Response.ok) throw new Error("The GRI-Mech 3.0 mechanism could not be loaded.");
    pyodide.FS.writeFile("/tmp/flameaid-gri30.yaml", await gri30Response.text());
    computePropertiesButton.disabled = false;
    calculateButton.textContent = "Calculate Flame Temperature";
    computePropertiesButton.textContent = "Compute Fuel Properties";
    engineStatus.textContent = "Chemistry engine ready. Your inputs stay in this browser.";
    blendStatus.textContent = "Chemistry engine ready. Fuel blends are calculated in this browser.";
    updateAFTAvailability();
  } catch (error) {
    engineStatus.textContent = error.message || "Unable to start the browser chemistry engine.";
    blendStatus.textContent = error.message || "Unable to start the browser chemistry engine.";
    calculateButton.textContent = "Engine unavailable";
    console.error(error);
  }
}

const PYTHON_CALCULATE = `
import cantera as ct
import json
import math

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

def calculate_blend_properties(payload):
    allowed_species = {
        "H2", "CO", "CH4", "C2H2", "C2H4", "C2H6", "C3H8", "CH3OH",
        "NH3", "CO2", "N2", "H2O", "O2", "AR"
    }
    parts = {}
    for row in payload["rows"]:
        species = row["species"]
        value = float(row["molarParts"])
        if species not in allowed_species:
            raise ValueError("Choose a species from the GRI-Mech 3.0 blend list.")
        if not math.isfinite(value) or value < 0:
            raise ValueError("Molar parts must be finite values at or above zero.")
        if species in parts:
            raise ValueError("Each species can only be added once.")
        if value > 0:
            parts[species] = value
    total = sum(parts.values())
    if not math.isfinite(total) or total <= 0:
        raise ValueError("Enter a positive total of molar parts.")
    fuel = {species: value / total for species, value in parts.items()}

    gas = ct.Solution(payload["mechanism_path"], payload["phase"])
    temperature = float(payload["temperature_k"])
    pressure = float(payload["pressure_pa"])
    if not math.isfinite(temperature) or temperature <= 0 or not math.isfinite(pressure) or pressure <= 0:
        raise ValueError("Temperature and pressure must be finite and positive.")
    gas.TPX = temperature, pressure, fuel
    normalized_fuel = {name: float(gas.X[gas.species_index(name)]) for name in fuel}
    fuel_mw = float(gas.mean_molecular_weight)
    density = float(gas.density)
    viscosity = float(gas.viscosity)
    conductivity = float(gas.thermal_conductivity)
    cp = float(gas.cp_mass)
    cv = float(gas.cv_mass)
    gas.TPX = temperature, pressure, "O2:1,N2:3.76"
    specific_gravity = density / float(gas.density)

    atoms = {}
    for element in ("C", "H", "O", "N", "Ar"):
        element_index = gas.element_index(element)
        atoms[element] = sum(
            amount * gas.n_atoms(gas.species_index(name), element_index)
            for name, amount in normalized_fuel.items()
        )
    oxygen_demand = atoms["C"] + atoms["H"] / 4.0 - atoms["O"] / 2.0
    if not math.isfinite(oxygen_demand) or oxygen_demand <= 0:
        raise ValueError("Fuel blend must have positive external oxygen demand.")
    oxygen_mw = float(gas.molecular_weights[gas.species_index("O2")])
    nitrogen_mw = float(gas.molecular_weights[gas.species_index("N2")])
    stoich_air_fuel = oxygen_demand * (oxygen_mw + 3.76 * nitrogen_mw) / fuel_mw

    reference_temperature = 298.15
    reference_pressure = 101325.0
    reactants = dict(normalized_fuel)
    reactants["O2"] = reactants.get("O2", 0.0) + oxygen_demand
    gas.TPX = reference_temperature, reference_pressure, reactants
    reactant_enthalpy = float(gas.enthalpy_mass)
    fuel_mass_fraction = fuel_mw / (fuel_mw + oxygen_demand * oxygen_mw)

    products = {}
    if atoms["C"] > 0:
        products["CO2"] = atoms["C"]
    if atoms["H"] > 0:
        products["H2O"] = atoms["H"] / 2.0
    if atoms["N"] > 0:
        products["N2"] = atoms["N"] / 2.0
    if atoms["Ar"] > 0:
        products["AR"] = atoms["Ar"]
    gas.TPX = reference_temperature, reference_pressure, products
    product_enthalpy = float(gas.enthalpy_mass)
    water_mass_fraction = float(gas.Y[gas.species_index("H2O")]) if atoms["H"] > 0 else 0.0
    lhv = -(product_enthalpy - reactant_enthalpy) / fuel_mass_fraction

    water = ct.PureFluid("liquidvapor.yaml", "water")
    water.TQ = reference_temperature, 0.0
    liquid_water_enthalpy = float(water.enthalpy_mass)
    water.TQ = reference_temperature, 1.0
    vapor_water_enthalpy = float(water.enthalpy_mass)
    hhv = -(
        product_enthalpy - reactant_enthalpy
        + (liquid_water_enthalpy - vapor_water_enthalpy) * water_mass_fraction
    ) / fuel_mass_fraction

    return json.dumps({
        "normalized_fuel": normalized_fuel,
        "mole_fractions": normalized_fuel,
        "lhv_j_per_kg": lhv,
        "hhv_j_per_kg": hhv,
        "density_kg_per_m3": density,
        "dynamic_viscosity_pa_s": viscosity,
        "kinematic_viscosity_m2_per_s": viscosity / density,
        "mean_molecular_weight_kg_per_kmol": fuel_mw,
        "specific_gravity": specific_gravity,
        "cp_j_per_kg_k": cp,
        "cv_j_per_kg_k": cv,
        "gamma": cp / cv,
        "thermal_conductivity_w_per_mk": conductivity,
        "stoich_air_fuel_ratio": stoich_air_fuel
    })

def calculate_blend_aft(payload):
    return calculate({
        "mechanism_path": payload["mechanism_path"],
        "phase": payload["phase"],
        "temperature_k": payload["temperature_k"],
        "pressure_pa": payload["pressure_pa"],
        "fuel": payload["fuel"],
        "fuel_kind": "custom",
        "mode": "equivalence",
        "phi": payload["phi"],
        "fuel_flow": 0.0,
        "air_flow": 0.0,
        "fuel_unit_factor": 1.0,
        "air_unit_factor": 1.0,
        "liquid_density": 800,
        "product_species": ["CO2", "H2O", "CO", "H2", "O2", "N2"]
    })
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
  if (fuelSelect.value === "custom" && (!computedFuelComposition || computedBlendRevision !== blendInputRevision)) {
    engineStatus.textContent = "Blend inputs changed. Recompute fuel properties before using this blend in AFT.";
    return;
  }
  const selected = fuelSelect.value === "custom"
    ? { ...mechanisms.methane, fuel: computedFuelComposition, label: "Custom gas blend + air · GRI-Mech 3.0" }
    : mechanisms[fuelSelect.value];
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
      mechanism_path: fuelSelect.value === "custom" ? "/tmp/flameaid-gri30.yaml" : "/tmp/flameaid-mechanism.yaml",
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

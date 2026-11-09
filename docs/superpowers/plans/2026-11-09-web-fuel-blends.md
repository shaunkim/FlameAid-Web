# Web Fuel Blends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-local Fuel Blends calculator whose calculated GRI-Mech 3.0 blend can also drive the web demo's adiabatic flame-temperature calculation.

**Architecture:** Keep the existing Pyodide and Cantera runtime. Add browser-side calculator view switching and a blend-input model, then extend the Python Cantera module with fuel-property and custom-fuel AFT entry points. Keep methane and Jet-A behavior intact.

**Tech Stack:** Static HTML/CSS/JavaScript, Pyodide 0.29.4, Cantera WebAssembly wheel, GRI-Mech 3.0 YAML.

**Spec:** `docs/superpowers/specs/2026-11-09-web-fuel-blends-design.md`

## Global Constraints

- All chemistry runs in the user's browser; no calculation server or additional runtime.
- Fuel Blends and custom-fuel AFT use GRI-Mech 3.0 only.
- Match the iOS 14-species list and `H2:50,CO:50,CH4:0` starting rows.
- Entered values are nonnegative molar parts; positive totals are normalized, and zero rows are omitted.
- Preserve existing methane/air GRI-Mech and Jet-A/POSF10325 HyChem UCSD-NOx AFT paths.
- Blend state is kept across calculator-tab changes in the active page session only.

## Review Focus

- Negative, non-finite, or all-zero molar parts must not reach Cantera.
- A blend with duplicate species must be combined or rejected before calculation; the UI should prevent duplicates as in iOS.
- Zero-part species must be excluded from the normalized Cantera composition.
- An inert-only blend or mixture with no positive external oxygen demand must show a clear calculation error.
- Cantera transport or liquid-water data failures must be surfaced as an engine status, not a blank result.

---

### Task 1: Add calculator view switching and Fuel Blends controls

**Files:**
- Modify: `site/index.html`
- Modify: `site/styles.css`
- Modify: `site/app.js`

**Interfaces:**
- Produces: `activeCalculator` values `"aft" | "fuel-blends"`; `showCalculator(name)` switches the visible calculator and active tab without resetting inputs.
- Produces: a blend input payload with `rows: [{species: string, molarParts: number}]`, `temperature_k`, and `pressure_pa`.

- [ ] Replace the Fuel Blends app-only tab with a real tab; keep Ignition Delay and Flame Speed app-only.
- [ ] Add a Fuel Blends view with three default rows (`H2 50`, `CO 50`, `CH4 0`), an Add species control, editable species and molar-parts controls, a raw total indicator, and per-row removal.
- [ ] Add condition controls defaulting to 300 K and 101.325 kPa, a **Compute Fuel Properties** action, the 12 iOS property result rows, and an AFT section with equivalence-ratio input/control and result.
- [ ] Keep inputs and completed results when switching between Flame Temp and Fuel Blends in the active page session.
- [ ] Keep the interface responsive and consistent with the existing light iOS-inspired cards, orange active tab, and mobile stacking.

### Task 2: Implement Cantera blend properties and custom-fuel AFT

**Files:**
- Modify: `site/app.js`

**Interfaces:**
- Consumes: blend input payload from Task 1.
- Produces: `calculate_blend_properties(payload) -> JSON` containing `normalized_fuel`, `mole_fractions`, LHV/HHV in J/kg, density in kg/m³, dynamic viscosity in Pa·s, kinematic viscosity in m²/s, mean molecular weight in kg/kmol, specific gravity, `cp` and `cv` in J/(kg·K), gamma, thermal conductivity in W/(m·K), and stoichiometric air/fuel ratio in kg/kg.
- Produces: `calculate_blend_aft(payload) -> JSON` containing `temperature_k` and `phi`.

- [ ] Normalize positive molar parts, exclude zero rows, and reject invalid or non-combustible input with a readable error.
- [ ] Use Cantera's GRI-Mech 3.0 phase for density, transport, thermodynamic values, stoichiometric air demand, and equilibrium AFT.
- [ ] Match the iOS heating-value method at 298.15 K and 101325 Pa: vapor-water products for LHV and a liquid-water condensation correction for HHV using Cantera's water data.
- [ ] Use the entered temperature and pressure for density, transport, thermodynamic properties, and AFT; compute specific gravity against dry air at the same state.
- [ ] Route the active calculator's submit action to either the existing flame-temperature calculation or the new Fuel Blends calculation without blocking the browser main UI longer than the existing synchronous calculation path.

### Task 3: Connect a completed blend to the existing AFT calculator

**Files:**
- Modify: `site/index.html`
- Modify: `site/app.js`

**Interfaces:**
- Consumes: successful `normalized_fuel` result from Task 2.
- Produces: a temporary `Custom Blend` fuel option in the Flame Temp view, using GRI-Mech 3.0 and the last successfully computed normalized fuel composition.

- [ ] Make a successfully computed blend available to the Flame Temp calculator as a temporary fuel choice.
- [ ] For this choice, show only equivalence-ratio input and disable mass/volume flow modes; do not reuse methane or Jet-A flow defaults.
- [ ] Keep methane and Jet-A fuel options and their current mechanisms, input modes, and calculations unchanged.
- [ ] If blend composition inputs change after a successful properties calculation, require a fresh properties calculation before using the blend for AFT.

### Task 4: Document the web Fuel Blends support

**Files:**
- Modify: `README.md`
- Modify: `site/index.html`

- [ ] Update the included-calculations section to describe Fuel Blends and custom-blend AFT as browser-local GRI-Mech 3.0 calculations.
- [ ] Remove Fuel Blends from the app-only feature chooser copy; retain app-only directions for ignition delay, flame speed, and other fuels.
- [ ] Keep the existing caution and mechanism attribution; add Cantera heating-value and transport-method references if the implementation uses those APIs.
- [ ] Review the changed HTML, JavaScript, CSS, and Markdown for consistent labels and property units.

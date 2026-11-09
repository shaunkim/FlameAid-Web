# Web Fuel Blends Design

## Intent

Add the iOS Fuel Blends workflow to the Flame Aid web demo. It should use the existing browser-local Cantera/Pyodide engine and let a calculated blend feed the existing adiabatic flame-temperature calculator.

## Approaches

- **Integrated blend calculator (selected):** calculate blend properties in the browser and use that same composition for an equivalence-ratio AFT calculation. This matches the established iOS workflow and makes the feature useful in the web demo.
- **Properties-only page:** calculate fuel properties without connecting the blend to AFT. This is simpler, but leaves users to recreate the same blend in another tool.

## Goals

- Replace the Fuel Blends app-store prompt with a functional fourth calculator tab.
- Reuse the already-loaded Pyodide and Cantera runtime and bundled GRI-Mech 3.0 mechanism; do not add a calculation server or another chemistry runtime.
- Match the iOS species choices, three-row default (`H2:50`, `CO:50`, `CH4:0`), molar-parts input, total indicator, and normalization of any positive total.
- Calculate the same 12 properties as iOS: LHV, HHV, density, dynamic and kinematic viscosity, mean molecular weight, specific gravity, `cp`, `cv`, gamma, thermal conductivity, and stoichiometric air/fuel ratio.
- Allow the calculated custom blend to run through the existing AFT calculation using equivalence ratio.
- Keep the experience visually consistent with the current Flame Aid web demo and retain the user's current inputs when switching between the two calculators during the page session.

## Non-goals

- Fuel blends for ignition delay or flame speed.
- New fuel mechanisms, remote computation, user accounts, or server storage.
- A persistent blend library or calculation log in the web demo.

## Implementation calls

- Mirror the iOS curated GRI-Mech species list: H2, CO, CH4, C2H2, C2H4, C2H6, C3H8, CH3OH, NH3, CO2, N2, H2O, O2, and AR.
- Treat entered values as nonnegative molar parts. Omit zero entries and normalize remaining entries for Cantera; require a positive total. Show the raw total so users can see their entered basis.
- Default conditions to 300 K and 101.325 kPa, matching the native Fuel Blends calculator.
- Use the same Cantera definitions as iOS for heating values and transport properties. Keep the existing caution that these are mechanism-dependent engineering estimates.
- Keep the blend and computed properties in page memory while switching calculator tabs. Reload persistence is outside this change.

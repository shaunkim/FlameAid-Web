# Flame Aid Web Demo

<p align="center">
  <img src="site/assets/app-icon.png" alt="Flame Aid app icon" width="160">
</p>

[Try Flame Aid in your browser](https://shaunkim.github.io/FlameAid-Web/) to calculate adiabatic flame temperatures and fuel blend properties. GitHub Pages serves the engine and mechanism files, and Cantera runs the calculations on your device.

## Why I built this

I'm a combustion CFD engineer and have used Cantera for about a decade. During tests, I often need to turn measured fuel and air flows into an equivalence ratio and a quick estimate of adiabatic flame temperature. A few years ago I built a [Facebook chatbot](https://youtu.be/sT9sTux4E1k) that called a Python service on Heroku. Once that setup was no longer practical to run for free, I wanted something I could run on the phone itself.

Long time ago, I used to spend weeks, and at times months, trying to get OpenFOAM running on macOS. Googling compiler errors led me down rabbit holes that were often inefficient and sometimes the most fun part of learning. With Flame Aid, Codex worked through unfamiliar cross compilation toolchains much faster than I could on my own. That's where AI helped me most as an engineer who uses Cantera. I hope it leaves room for some of the detours that made learning fun in the first place.

## How Cantera runs on each platform

| Platform | Build and runtime |
| --- | --- |
| iOS | Flame Aid started as a native iOS app. We used SCons with Apple's SDK and compiler to cross compile Cantera's C++ library separately for arm64 iPhones and arm64 simulators. Xcode packages the static libraries as an XCFramework, and an Objective-C++ bridge connects the C++ calculator core to Swift. |
| Android | The port reuses the C++ calculator core and builds Cantera separately with the Android NDK. CMake builds the JNI bridge for `arm64-v8a` and `x86_64`, so the Kotlin app can call the native calculators on a phone or emulator. |
| Web | Browser JavaScript passes calculator inputs to Python through Pyodide. GitHub Actions builds a Cantera wheel for WebAssembly, and GitHub Pages serves it as a static file. Pyodide loads the wheel and runs the Python calculations in the browser. |

## Included calculations

- Methane/air using GRI-Mech 3.0.
- Jet-A/POSF10325 using the author-supplied HyChem A2 mechanism with the UCSD NOx subset (`A2highT_nox.yaml`). This is the lightweight UCSD-NOx mechanism; it is not Stanford's separate Glarborg NOx mechanism.
- Mixture entry by mass flow, actual volume flow, or equivalence ratio. Each stream has its own unit selector. Gas volume flow uses the entered initial temperature and pressure; Jet-A volume flow uses the editable liquid density.
- A GRI-Mech 3.0 **Fuel Blends** calculator for heating values and gas properties, with custom-blend adiabatic flame temperature by equivalence ratio.
- Adiabatic constant-pressure equilibrium (`HP`), with selected equilibrium products shown beneath the result.

Ignition delay, flame speed, and additional fuels open a chooser for the iOS and Android apps. Those calculations run locally on the phone.

## Numerical benchmarks and testing

The iOS project generated desktop fixtures with Cantera 3.2.0 and compared them with recorded native arm64 simulator results. All cases below use GRI-Mech 3.0 at 101.325 kPa. The methane cases and the S50 flame temperature case use dry air (`O2:1,N2:3.76`).

| Reference case | Desktop Cantera 3.2.0 | iOS simulator |
| --- | ---: | ---: |
| Methane flame temperature, 300 K, φ = 1, `HP` equilibrium | 2225.524583477 K | 2225.524583477 K |
| Methane ignition delay, 1000 K, φ ≈ 0.99537, constant pressure, 500 K rise | 1.0945563407 s | 1.0945563422 s |
| Methane laminar flame speed, 300 K, φ ≈ 0.99537, mixture-averaged transport | 0.37970918 m/s | 0.37976103 m/s |
| S50 lower heating value, 50 mol% H₂ / 50 mol% CO, reference state 298.15 K | 17.47828580 MJ/kg | 17.47828580 MJ/kg |
| S50 flame temperature, 293 K, φ = 1, `HP` equilibrium | 2366.510402326 K | 2366.510402326 K |

The methane ignition and flame speed cases use 1 kg/s fuel and 17.2 kg/s air. The flame speed case starts with a 0.03 m domain, uses refinement criteria of ratio 3.0, slope 0.06, and curve 0.10, and has Soret diffusion disabled.

The iOS integration checks used a 0.5 K absolute tolerance for flame temperature, 1% for ignition delay, and the larger of 1% or 0.005 m/s for flame speed. They also checked a 300 K methane case that reached the 10 s simulation limit without ignition and compared 12 S50 fuel properties against desktop fixtures. The [published S50 study](https://doi.org/10.3390/en12081566) reports an LHV of 17.5 MJ/kg and provides a separate check on the engineering scale.

To try the overlapping cases in the web demo, select Methane and enter φ = 1, 300 K, and 101.325 kPa. For S50, enter 50 molar parts each of H₂ and CO in Fuel Blends, set the blend to 293 K and 101.325 kPa, compute properties, then calculate flame temperature at φ = 1. The LHV uses the fixed reference state in the table.

The table summarizes earlier iOS simulator runs and desktop calculations. The browser build uses a separate Cantera revision and still needs its own comparison. For Jet-A flame temperature, the historical iOS fixture used the baseline `A2highT.yaml`, while the web demo uses `A2highT_nox.yaml`. The Jet-A paper below documents the mechanism used by the demo.


## Data and licensing

The BSD 3-Clause license at the repository root applies to original Flame Aid Web Demo code only. It does not relicense Cantera, GRI-Mech 3.0, or the supplied Jet-A mechanism. See [third-party notices](ThirdPartyNotices/README.md) and [HyChem mechanism notes](ThirdPartyNotices/HyChem-A2.md) for attribution and data provenance.

## Links

- [Flame Aid Web Demo](https://shaunkim.github.io/FlameAid-Web/)
- [Flame Aid Web Demo source](https://github.com/shaunkim/FlameAid-Web)
- [Flame Aid for iPhone](https://apps.apple.com/app/id6827337125)
- [Flame Aid on Google Play](https://play.google.com/store/apps/details?id=com.lunaandsol.flameaid)
- [Cantera](https://cantera.org)
- [GRI-Mech 3.0](https://combustion.berkeley.edu/gri-mech/version30/text30.html)

## References

1. S. Kim, *ASME Journal of Engineering for Gas Turbines and Power*, **148**(11), 111017 (2026). [Article](https://asmedigitalcollection.asme.org/gasturbinespower/article/148/11/111017/1234757). This paper describes the lightweight HyChem A2 mechanism with the UCSD NOx subset used for the Jet-A flame-temperature calculation in this demo.
2. H. Wang et al., “A physics-based approach to modeling real-fuel combustion chemistry—I. Evidence from experiments, and thermodynamic, chemical kinetic and statistical considerations,” *Combustion and Flame*, **193** (2018), 502–519. [Stanford HyChem source and references](https://web.stanford.edu/group/haiwanglab/HyChem/).
3. R. Xu et al., “A physics-based approach to modeling real-fuel combustion chemistry—II. Reaction kinetic models of jet and rocket fuels,” *Combustion and Flame*, **193** (2018), 520–537. [Stanford HyChem source and references](https://web.stanford.edu/group/haiwanglab/HyChem/).
4. GRI-Mech 3.0, G. P. Smith et al. [Mechanism, thermodynamic data, and transport data](https://combustion.berkeley.edu/gri-mech/version30/text30.html).
5. D. G. Goodwin, H. K. Moffat, I. Schoegl, R. L. Speth, and B. W. Weber, *Cantera: An Object-oriented Software Toolkit for Chemical Kinetics, Thermodynamics, and Transport Processes*. [Cantera citation guidance](https://cantera.org/citations.html).
6. [Cantera heating-value calculations](https://cantera.org/3.2/userguide/heating-value.html) and [transport properties](https://cantera.org/3.2/reference/transport/index.html) document the thermochemical and transport-property methods used for gas blends.

## Caution

Use results with care. The calculations depend on the selected mechanism, input state, and equilibrium assumptions; they do not guarantee combustion analysis. The browser build uses the Cantera development version required for the current upstream Pyodide build path, so numerical agreement with the mobile app must be established before relying on the demo for engineering work.

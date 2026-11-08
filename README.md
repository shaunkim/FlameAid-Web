# Flame Aid Web Demo

<p align="center">
  <img src="site/assets/app-icon.png" alt="Flame Aid app icon" width="160">
</p>

Static GitHub Pages demo for adiabatic flame temperature. The page follows Flame Aid's light iOS layout and orange accent. The browser downloads the Cantera WebAssembly engine and mechanism data as static assets; thermochemistry is computed on the visitor's device. There is no calculation server or user account.

## Why I built this

I am a combustion CFD engineer and have used Cantera for about a decade. During tests, I often need to turn measured fuel and air flows into equivalence ratio and a quick flame-temperature estimate. I first tried solving that problem with a Facebook chatbot and a Python service on Heroku, but that setup was no longer practical to operate for free. With help from OpenAI Codex, I cross-compiled Cantera for iOS and built the on-device tool I wanted in the test cell.

## Included calculations

- Methane/air using GRI-Mech 3.0.
- Jet-A/POSF10325 using the author-supplied HyChem A2 mechanism with the UCSD NOx subset (`A2highT_nox.yaml`). This is the lightweight UCSD-NOx mechanism; it is not Stanford's separate Glarborg NOx mechanism.
- Mixture entry by mass flow, actual volume flow, or equivalence ratio. Each stream has its own unit selector. Gas volume flow uses the entered initial temperature and pressure; Jet-A volume flow uses the editable liquid density.
- Adiabatic constant-pressure equilibrium (`HP`), with selected equilibrium products shown beneath the result.

Ignition delay, flame speed, additional fuels, and Fuel Blends open a chooser for the iOS and Android apps. These calculations run locally on the phone.

## GitHub Pages

Push to `main` or run the **Build and deploy Flame Aid Web Demo** workflow. GitHub Actions builds a Pyodide-compatible Cantera wheel from the pinned upstream Cantera commit, adds it to `site/assets/`, and publishes the static `site/` directory. The browser runtime is pinned to Pyodide 0.29.4 on jsDelivr; it serves static WebAssembly/Python runtime files only. Cantera calculations run locally in the browser.

GitHub Pages must be enabled with **Build and deployment: GitHub Actions**. The published project site URL is `https://shaunkim.github.io/FlameAid-Web/`.

## Local preview

Serve `site/` with a static-file preview server. The Cantera wheel is added by the Pages workflow, so a local preview before that workflow completes will show the interface but will not calculate.

## Data and licensing

The BSD 3-Clause license at the repository root applies to original Flame Aid Web Demo code only. It does not relicense Cantera, GRI-Mech 3.0, or the supplied Jet-A mechanism. See [third-party notices](ThirdPartyNotices/README.md) and [HyChem mechanism notes](ThirdPartyNotices/HyChem-A2.md) for attribution and data provenance.

## Links

- [Flame Aid Web Demo](https://shaunkim.github.io/FlameAid-Web/)
- [Flame Aid Web Demo source](https://github.com/shaunkim/FlameAid-Web)
- [Flame Aid for iPhone](https://apps.apple.com/app/id6827337125)
- Google Play: coming soon
- [Cantera](https://cantera.org)
- [GRI-Mech 3.0](https://combustion.berkeley.edu/gri-mech/version30/text30.html)

## References

1. S. Kim, *ASME Journal of Engineering for Gas Turbines and Power*, **148**(11), 111017 (2026). [Article](https://asmedigitalcollection.asme.org/gasturbinespower/article/148/11/111017/1234757). This paper describes the lightweight HyChem A2 mechanism with the UCSD NOx subset used for the Jet-A flame-temperature calculation in this demo.
2. H. Wang et al., “A physics-based approach to modeling real-fuel combustion chemistry—I. Evidence from experiments, and thermodynamic, chemical kinetic and statistical considerations,” *Combustion and Flame*, **193** (2018), 502–519. [Stanford HyChem source and references](https://web.stanford.edu/group/haiwanglab/HyChem/).
3. R. Xu et al., “A physics-based approach to modeling real-fuel combustion chemistry—II. Reaction kinetic models of jet and rocket fuels,” *Combustion and Flame*, **193** (2018), 520–537. [Stanford HyChem source and references](https://web.stanford.edu/group/haiwanglab/HyChem/).
4. GRI-Mech 3.0, G. P. Smith et al. [Mechanism, thermodynamic data, and transport data](https://combustion.berkeley.edu/gri-mech/version30/text30.html).
5. D. G. Goodwin, H. K. Moffat, I. Schoegl, R. L. Speth, and B. W. Weber, *Cantera: An Object-oriented Software Toolkit for Chemical Kinetics, Thermodynamics, and Transport Processes*. [Cantera citation guidance](https://cantera.org/citations.html).

## Caution

Use results with care. The calculations depend on the selected mechanism, input state, and equilibrium assumptions; they do not guarantee combustion analysis. The browser build uses the Cantera development version required for the current upstream Pyodide build path, so numerical agreement with the mobile app must be established before relying on the demo for engineering work.

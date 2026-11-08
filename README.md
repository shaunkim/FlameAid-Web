# Flame Aid Web Demo

Static GitHub Pages demo for adiabatic flame temperature. The page follows Flame Aid's light iOS layout and orange accent. The browser downloads the Cantera WebAssembly engine and mechanism data as static assets; thermochemistry is computed on the visitor's device. There is no calculation server or user account.

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

- [Flame Aid Web Demo source](https://github.com/shaunkim/FlameAid-Web)
- [Flame Aid for iPhone](https://apps.apple.com/app/id6827337125)
- [Flame Aid for Android](https://play.google.com/store/apps/details?id=com.lunaandsol.flameaid)
- [Cantera](https://cantera.org)
- [GRI-Mech 3.0](https://combustion.berkeley.edu/gri-mech/version30/text30.html)

## Caution

Use results with care. The calculations depend on the selected mechanism, input state, and equilibrium assumptions; they do not guarantee combustion analysis. The browser build uses the Cantera development version required for the current upstream Pyodide build path, so numerical agreement with the mobile app must be established before relying on the demo for engineering work.

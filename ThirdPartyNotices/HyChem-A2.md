# Jet-A HyChem A2 / UCSD-NOx mechanism

This demo uses the app-author-supplied `A2highT_nox.yaml` mechanism for POSF10325 Jet-A adiabatic flame-temperature calculations. It combines the HyChem A2 fuel chemistry with the UCSD NOx subset described and validated in the app author's paper: [ASME Journal of Engineering for Gas Turbines and Power, 148(11), 111017](https://asmedigitalcollection.asme.org/gasturbinespower/article/148/11/111017/1234757).

This is the lightweight UCSD-NOx mechanism. It is not Stanford's separate A2 NOx model based on the Glarborg nitrogen chemistry. The baseline `A2highT.yaml` file used by the mobile app for Jet-A ignition-delay and flame-speed calculations is not included in this web demo.

The base HyChem work is described in:

1. H. Wang et al., “A physics-based approach to modeling real-fuel combustion chemistry—I. Evidence from experiments, and thermodynamic, chemical kinetic and statistical considerations,” *Combustion and Flame* 193 (2018), 502–519.
2. R. Xu et al., “A physics-based approach to modeling real-fuel combustion chemistry—II. Reaction kinetic models of jet and rocket fuels,” *Combustion and Flame* 193 (2018), 520–537.

Source: [Stanford HyChem Cantera downloads](https://web.stanford.edu/group/haiwanglab/HyChem/pages/download_cantera.html). The Stanford pages request citation of the original HyChem publications above.

The mechanism is distinct research data and is not covered by the BSD 3-Clause license for this demo's original code. Stanford's HyChem download pages did not identify an explicit redistribution license when checked in September 2026. The web demo uses the UCSD-NOx variant supplied by the app author; its publication in this repository does not grant rights to Stanford's separately distributed baseline mechanism. For questions about the supplied file or its intended use, contact the app author.

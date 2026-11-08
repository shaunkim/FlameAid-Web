# Third-party software and data

The BSD 3-Clause license in the repository root applies only to original Flame Aid Web Demo code. It does not change the license or terms for the items listed here.

| Item | Use in this demo | Terms and source |
| --- | --- | --- |
| Cantera | Browser-side chemistry engine, built from upstream commit `25c1ab1c397e2991c77560b1ad5154919a12c733` | BSD 3-Clause; see [Cantera-License.txt](Cantera-License.txt) and [Cantera source](https://github.com/Cantera/cantera/tree/25c1ab1c397e2991c77560b1ad5154919a12c733). |
| GRI-Mech 3.0 | Methane/air mechanism data in `site/assets/mechanisms/gri30.yaml` | Distributed with Cantera; see Cantera's license and [GRI-Mech 3.0 source](https://combustion.berkeley.edu/gri-mech/version30/text30.html). |
| Boost | Headers used while building the Cantera WebAssembly wheel | Boost Software License 1.0; see [Boost-License.txt](Boost-License.txt). |
| HyChem A2 with UCSD NOx | Jet-A/POSF10325 flame-temperature mechanism in `site/assets/mechanisms/A2highT_nox.yaml` | Author-supplied research mechanism; see [HyChem-A2.md](HyChem-A2.md). Separate from the BSD license covering this demo's original code. |
| Pyodide | Static WebAssembly/Python runtime loaded from jsDelivr at pinned version 0.29.4 | Not copied into this repository. See the [Pyodide project](https://github.com/pyodide/pyodide) and its license. |

The Pages workflow builds a Pyodide-compatible Cantera wheel from the pinned source commit and publishes it as a static site asset. No remote calculation service is used.

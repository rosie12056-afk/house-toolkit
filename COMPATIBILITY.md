# Compatibility

## Current release

House Toolkit `v0.2.1` depends on the exact Git tag `house-protocols#v0.2.1`. Its lockfile resolves that tag to a commit SHA. The Toolkit retains the `0.1` and `0.2` profiles and adds lifecycle conformance for additive `0.2` contracts.

| Toolkit | Protocols package | Document profile | Node.js | Status |
| --- | --- | --- | --- | --- |
| `v0.1.1` | exact `v0.1.1` | `0.1` | 20, 22, 24 | Tested |
| `v0.2.0` | exact `v0.2.0` | separate `0.1` and `0.2` profiles | 20, 22, 24 | Tested and released |
| `v0.2.1` | exact `v0.2.1` | `0.1`, `0.2`, and lifecycle fixture conformance | 20, 22, 24 | Tested and released |
| `v0.3.0-rc.1` | exact Protocols `v0.3.0-rc.1` | v0.2 records plus Runtime API, Memory Port, and Runtime client candidate behavior | 20, 22, 24 | Release candidate; cross-repository conformance |
| `v0.3.0-rc.2` | exact Protocols `v0.3.0-rc.2` | RC1 behavior plus Run listing and Evidence/Initiative readback | 20, 22, 24 | Release candidate for operational clients |
| `v0.3.0-rc.3` | exact Protocols `v0.3.0-rc.2` | Same RC2 client surface with Evidence readback checked against the protocol's `bundle_id` | 20, 22, 24 | Supersedes Toolkit RC2 |

## Upgrade rules

- Publishing House Protocols v0.2 does not alter Toolkit v0.1.1. The dependency is not a range and cannot float to a new minor version.
- Toolkit v0.2 must preserve an explicit v0.1 profile while adding v0.2, unless a documented security correction makes a specific v0.1 input unsafe.
- New or changed rule codes require success and failure fixtures, JSON-report regression tests, and release notes.
- Exit code `0` means the selected rules passed, `1` means findings exist, and `2` means the input or invocation is unusable. This contract remains stable within each published compatibility line.

House Toolkit is a development dependency of House Runtime `v0.1.0-alpha.1`; it is not loaded by the Runtime in production execution.

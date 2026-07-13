# Compatibility

## Current release

House Toolkit `v0.1.1` depends on the exact Git tag `house-protocols#v0.1.1`. Its lockfile resolves that tag to a commit SHA. It validates documents declaring `protocol_version: "0.1"`.

| Toolkit | Protocols package | Document profile | Node.js | Status |
| --- | --- | --- | --- | --- |
| `v0.1.1` | exact `v0.1.1` | `0.1` | 20, 22, 24 | Tested |
| planned `v0.2` | explicit v0.2 release | separate `0.1` and `0.2` profiles | defined before release | Not yet implemented |

## Upgrade rules

- Publishing House Protocols v0.2 does not alter Toolkit v0.1.1. The dependency is not a range and cannot float to a new minor version.
- Toolkit v0.2 must preserve an explicit v0.1 profile while adding v0.2, unless a documented security correction makes a specific v0.1 input unsafe.
- New or changed rule codes require success and failure fixtures, JSON-report regression tests, and release notes.
- Exit code `0` means the selected rules passed, `1` means findings exist, and `2` means the input or invocation is unusable. This contract remains stable throughout v0.1.x.

House Toolkit is a development dependency of House Runtime `v0.1.0-alpha.1`; it is not loaded by the Runtime in production execution.

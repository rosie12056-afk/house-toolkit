# Roadmap

House Toolkit turns House Protocols trust boundaries into local, repeatable checks. Releases are gated by protocol fixtures and public-clone verification rather than calendar dates.

For the five-repository dependency timeline, see the canonical [House Ecosystem Roadmap](https://github.com/rosie12056-afk/house-protocols/blob/main/ECOSYSTEM-ROADMAP.md).

| Milestone | Target gate | What it adds | Problem solved | Primary users |
| --- | --- | --- | --- | --- |
| v0.1 | Released | Privacy scan, Evidence lint, Initiative lint, stable exit codes, JSON reports, and fictional fixtures | Gives maintainers small checks they can add without adopting House Runtime | Repository maintainers and CI users |
| v0.2 | Released after Protocols v0.2 fixtures and Runtime `alpha.2` conformance | Memory-boundary lint, full protocol conformance profiles, v0.1/v0.2 fixture selection, repository publication profile, and optional SARIF output | Detects unsafe memory promotion and makes cross-repository compatibility machine-checkable | Memory-system and Runtime implementers |
| v0.3 | After Runtime `alpha.2` and the first external fixture set | Migration audit, adapter conformance, policy-diff reports, baseline/suppression files with expiry, and a composed release audit command | Helps larger projects upgrade without turning suppressions into permanent blind spots | Multi-adapter projects and release engineers |

## Release gates

- v0.2 does not ship until it validates both retained v0.1 fixtures and the Protocols v0.2 release-candidate fixtures.
- v0.3 does not ship until at least one non-Runtime fixture set proves the commands are not coupled to House's demo structure.
- Scanner rules remain local-only and never receive credentials or upload inspected content.
- A lint result remains evidence of a rule match, not proof that a repository is completely safe.

See [COMPATIBILITY.md](COMPATIBILITY.md) for the exact protocol lock.

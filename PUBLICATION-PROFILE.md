# Public Repository Profile

This profile is a release gate, not a guarantee that a repository contains no private material.

## Required checks

1. Run repository tests from a clean clone.
2. Run `house-privacy-scan` with `--english-only` for an English-only release and a caller-owned deny-term file for private names or codenames.
3. Exclude only generated, dependency, and deliberately invalid fixture paths. Every exclusion must be visible in the command or repository script.
4. Run a secret-history scanner before the first public push and before rewriting tags.
5. Inspect `npm pack --dry-run` or the equivalent package manifest so ignored source files do not enter an artifact.
6. Confirm examples use fictional identities, endpoints, email addresses, memories, and workspaces.

## Failure policy

- A finding blocks publication until it is removed or covered by a narrow, reviewed allowlist.
- Allowlist files contain public text only. Private deny terms remain outside the repository.
- Scanner output records rule codes and locations, never secret values.
- Passing scans do not authorize publication; repository ownership and license checks remain separate gates.

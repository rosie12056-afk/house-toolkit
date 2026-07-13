# House Toolkit

House Toolkit provides local auditing and conformance commands for persistent agent systems. It validates evidence boundaries, initiative completion, and repository privacy without starting an agent runtime or uploading inspected files.

This repository is experimental. Its exit codes and JSON report format are part of the v0.1 compatibility surface; individual detection rules may become stricter.

## Included commands

- `house-privacy-scan`: finds likely secrets, personal paths, email addresses, private network endpoints, forbidden file types, configured deny terms, and optional non-English public content.
- `house-evidence-lint`: validates House Evidence Bundles and rejects external facts supported only by model output.
- `house-initiative-lint`: validates House Initiative Records and rejects completion without a successful action, an output or result, and linked evidence.

The evidence and initiative commands consume [House Protocols](https://github.com/rosie12056-afk/house-protocols) v0.1 documents.

## Five-minute check

```bash
npm install
npm test

node ./bin/evidence-lint.mjs test/fixtures/evidence/valid.json
node ./bin/initiative-lint.mjs test/fixtures/initiative/invalid-completed.json --json
node ./bin/privacy-scan.mjs . --exclude test/fixtures/privacy/invalid.txt --english-only
```

All commands return:

- exit code `0` when every inspected input passes;
- exit code `1` when findings or validation errors exist;
- exit code `2` for invalid arguments, unreadable input, or malformed JSON.

Use `--json` for a machine-readable report. Reports identify files, line numbers, and rule codes but never print a detected secret value.

## Privacy scan options

```text
house-privacy-scan [paths...] [options]

--json                    Print JSON only
--exclude <path>          Exclude a relative path; repeatable
--deny-term-file <file>   Read private terms from a local newline-delimited file
--english-only            Report Han text in public material
--allow-text-file <file>  Remove explicitly allowed text before language checks
--help                    Show help
```

The deny-term and allow-text files are read locally and are not copied into reports. Keep private rule files outside a public repository.

## Boundaries

- A model output proves only that the model produced it. It cannot alone establish an external fact.
- Accurate retrieval does not make retrieved content true.
- An Initiative cannot be completed merely because a model says it is complete.
- Scanner findings are warnings backed by explicit rules, not a guarantee that a repository is private or safe.
- The toolkit never requests API keys and never sends inspected data over the network.
- House Runtime Engine, real agent data, connectors, and production policy are not included.

## Development

```bash
npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

Apache-2.0.

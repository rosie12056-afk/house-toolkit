# Contributing

House Toolkit v0.1 is experimental. A change to a rule code, exit code, or JSON report field must include a compatibility note and regression tests.

```bash
npm install
npm run check
```

Contributions must use fictional data. Do not submit real users, agents, conversations, memories, prompts, email addresses, endpoints, credentials, databases, or absolute local paths.

Every detector must report a stable rule code and location without echoing the matched secret or private value. Network access must never be added to scanning code.

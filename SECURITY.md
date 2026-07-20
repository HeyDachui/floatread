# Security policy

## Supported version

Security fixes target the latest release on the `main` branch. Version `0.1.x` is the current supported line.

## Reporting a vulnerability

Do not open a public issue containing a vulnerability, credential, selected private text or exploit details. Use the repository owner's private security-reporting channel once the canonical repository is published. Until that identity is finalized, contact the source recipient privately and include affected version, impact, reproduction steps and a minimal proof without real secrets.

Never send a real Provider key as part of a report. Revoke any key that may have been exposed.

## Security guarantees and limits

- No `eval`, `new Function`, remote scripts or runtime third-party code.
- Provider requests are reconstructed and sent only by the Background Service Worker.
- Content Scripts cannot read credentials and public messages are runtime validated.
- Model output is rendered as text, not `innerHTML`.
- Community skins accept strict JSON and PNG/WebP only, with archive and image limits.
- Remote Provider URLs require HTTPS; Ollama HTTP is limited to loopback addresses.
- Production artifacts exclude source maps, tests, environment files and local secrets.
- API keys can be protected by trust boundaries and redaction, but browser storage is not a hardware vault.

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for trust boundaries and [PRIVACY.md](PRIVACY.md) for data handling.

## Maintainer release checks

```bash
pnpm audit
pnpm ci
pnpm package
pnpm test:release-load
pnpm scan:secrets
pnpm verify:release
git status --short
```

Real API tests must use one low-limit revocable key at a time from an ignored local file, environment variable or temporary Chrome profile. Test logs record Provider/model/result only and never echo the key or Authorization header.

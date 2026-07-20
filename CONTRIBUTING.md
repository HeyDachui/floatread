# Contributing to FloatRead

Thank you for helping improve FloatRead. By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md) and license your contribution under the repository's MIT License.

## Product invariants

Contributions must not add a developer backend, accounts, payments, advertising, analytics or telemetry. Do not insert UI into posts, scan timelines, depend on X internal selectors, inject global page CSS, or send unselected page content. Provider credentials and network requests stay in trusted extension contexts.

## Setup

```bash
pnpm install --frozen-lockfile
pnpm ci
```

Use Node.js 20.19+ and pnpm. Keep TypeScript strict, avoid `any` in core contracts, validate cross-context messages and external JSON at runtime, and render model output as text.

## Pull requests

1. Create a focused branch and describe the user-visible outcome and security impact.
2. Add or update unit, integration and real extension E2E coverage.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` and `pnpm build`.
4. Update documentation, `CHANGELOG.md` and migration logic when data formats change.
5. Never commit `.env`, `.secrets`, Provider keys, private selected text or generated credentials.

For skin contributions, follow [docs/SKINS.md](docs/SKINS.md). For Provider work, follow [docs/PROVIDERS.md](docs/PROVIDERS.md) and keep each protocol in an independent adapter.

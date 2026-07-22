# FloatRead 0.4.1 external AI audit handoff

## Package identity

- Project: FloatRead
- Version: 0.4.1
- Source authority: tracked files from the `main` Git snapshot used to create the source-audit ZIP
- Workspace of origin: `E:\AI-900\FloatRead`
- Owner: current FloatRead primary task
- Auditor: external AI selected by the owner
- Return path: the owner brings the audit findings back to the FloatRead primary task for evidence review, repair and closure

The exact Git commit and SHA-256 are supplied next to the delivered archive. The archive intentionally excludes `.git`, `.secrets`, environment files, `node_modules`, generated `dist`, generated release archives and local browser profiles.

## Audit goal

Perform an evidence-based security, privacy, correctness and Chrome Manifest V3 reliability audit. Report concrete findings with file paths, line numbers, triggering conditions, impact and a minimal reproduction or proof. Separate confirmed defects from hypotheses and design preferences.

Do not modify the package and do not request or use a real API Key. All Provider behavior needed for ordinary auditing is covered by mocks and unit tests.

## Product boundaries that must remain intact

- Open source, no developer backend, no accounts, no payments, no ads and no telemetry.
- Users call their own configured Provider; Content Script must never receive an API Key.
- No automatic AI request before explicit user activation.
- Page translation directly replaces eligible visible text; it must not inject buttons into posts or alter site layout.
- One fixed FloatRead host with isolated Shadow DOM styles.
- User Stop must cancel work and recovery; reload must not automatically restart page translation.
- No permanent `<all_urls>` host permission. Provider and generic-site access must be user-authorized.
- Model output is data, not trusted HTML or code.
- Skin packages may contain only validated JSON/PNG/WebP and must execute no code.

## Highest-priority audit targets

1. **Stop and cancellation:** inspect precision-reading and page-translation abort paths, dead-Port behavior, late events, retries, timeouts and Service Worker restarts.
2. **Original-source identity:** inspect how `page-translator.ts` restores original text before precision reading. Test duplicate identical translations, partial selections, multi-node selections, host re-renders and disconnected nodes.
3. **Secrets and trust boundaries:** prove Content Script cannot obtain Provider secrets; inspect storage modes, exports, logs, errors, caches and release scripts.
4. **Network and permissions:** inspect exact-origin validation, optional permission requests, redirects, custom Base URLs, localhost rules and Provider-specific request bodies.
5. **Page safety and performance:** inspect visibility checks, bounded batching, mutation behavior, X/TED/Reddit profiles, hidden-tab behavior and resistance to infinite dynamic timelines.
6. **Message protocol:** inspect every cross-context message for runtime validation, sender assumptions, request/job id handling and stale-context races.
7. **Prompt and output safety:** inspect prompt-injection defenses, strict page-result ids, malformed streaming JSON and pure-text rendering.
8. **Cache and usage accounting:** inspect stable cache identity, migrations, corruption recovery, eviction, Start-to-Stop Token totals and reconnect continuity.
9. **Skin and uploaded-image safety:** inspect MIME/extension/size/path validation, decompression limits, executable-field rejection and local image processing.
10. **Build integrity:** inspect Manifest permissions/CSP, production Mock exclusion, source-map/secret exclusion, ZIP inventory and version consistency.

## Known boundaries; do not misreport as hidden passes

- OpenAI, Anthropic, Gemini and Ollama have adapter/unit coverage but were not live-tested with real credentials in this release.
- The owner has observed X and TED working on real pages. Reddit remains untested by the owner.
- Headless Chromium did not reliably expose a real extension isolated-world `document.hidden` transition; hidden-tab behavior has deterministic module coverage and still merits manual Chrome observation.
- The source-restoration implementation is proven for whole translated selections. Duplicate translated phrases and partially selected translated nodes are explicit audit targets, not pre-declared defects or passes.
- Pet motion has automated state coverage and owner observation, but subjective animation quality is not a security claim.

## Reproduction commands

Requires Node.js 20.19+ and pnpm 10+ (repository package manager: pnpm 11.9.0).

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm package
```

Expected baseline for this snapshot:

- lint: zero warnings
- typecheck: passed
- unit: 27 files / 133 tests
- integration: 2 files / 2 tests
- Chromium extension E2E: 19 tests
- production ZIP: 20 entries and successful MV3 load check

## Requested audit report format

For every finding provide:

1. Severity: critical / high / medium / low.
2. Confidence: confirmed / likely / hypothesis.
3. Exact file and tight line range.
4. Trigger and affected user path.
5. Security, privacy, correctness or performance impact.
6. Reproduction evidence or reasoning chain.
7. Minimal recommended fix and tests that would prove it.

Also list reviewed areas with no finding, commands actually executed, commands not executed and their reason. Do not claim a test passed unless it was run.

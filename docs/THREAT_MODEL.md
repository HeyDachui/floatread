# Threat model

## Protected assets

- User-selected text and generated results.
- Provider credentials and local Provider profiles.
- Host permissions granted by the user.
- Integrity of extension code, settings, cache and skin packages.

## Trust boundaries and primary threats

| Boundary                           | Threat                                                            | Required control                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Host page → Content Script         | DOM tampering, forged page events, CSS interference               | Isolated world, one zero-size host, closed Shadow DOM, no page event bridge                                 |
| Content → Background               | Forged or oversized messages, attacker-chosen URL/header/prompt   | Discriminated schemas, sender checks, length limits, trusted settings reconstruction                        |
| Selected text → model              | Prompt injection                                                  | Fixed system prompt, explicit untrusted-data boundary, no tools/search/external context                     |
| Provider → UI                      | HTML/script injection or malformed streams                        | Strict parsers, public error mapping, React text nodes only, no URL auto-linking                            |
| Custom Base URL → network          | Credential exfiltration or arbitrary cleartext endpoint           | HTTPS remote origins, localhost-only HTTP, exact optional permission, no URL credentials/fragments          |
| Browser storage → trusted contexts | Key exposure to Content Scripts                                   | `TRUSTED_CONTEXTS` access levels, separate secret repository, no sync storage                               |
| Community skin → extension UI      | Executable content, traversal, decompression bomb, spoofed images | Strict Zod schema, entry count/size limits, normalized paths, signature and dimension checks, PNG/WebP only |
| Build/release                      | Secret or remote-code inclusion                                   | deterministic file allowlist checks, source/dist/ZIP secret scan, no source maps in release                 |
| User action → Provider cost        | Accidental or repeated usage                                      | explicit trigger, length cap, one request per tab, global cap, cancel, cache, no silent retries             |

## Security invariants

1. Content Script cannot read or receive an API Key.
2. Background never accepts a network URL, header, model or raw system prompt from Content.
3. No model request happens without a user action and a valid selection.
4. Model output and imported metadata never reach an HTML execution sink.
5. Production packages contain no remote executable code, secrets, tests, environment files or source maps.

These invariants are enforced by unit/integration/E2E tests plus production dist, release inventory and secret scans. DeepSeek has one explicitly authorized real-Provider smoke record; other adapters have protocol tests only. Mock coverage is never treated as live-Provider evidence.

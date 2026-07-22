# FloatRead 0.5.0 automatic local-memory release notes

FloatRead 0.5.0 adds an automatic translation-memory layer without changing the owner-tested 0.4.1 translation, Stop, Provider, permission or pet boundaries. The exact 0.4.1 source state remains available at Git tag `stable-v0.4.1`; its existing ZIP and SHA-256 remain under `release/`.

## What changed

- One 10 MB local-memory budget now covers page translation and precision reading.
- Recent content and repeated long-term content each target about 5 MB, but either side may borrow unused capacity.
- Eligible menu, button and short-phrase translations move to long-term memory after the third encounter.
- Settings show recent/long-term usage, reuse count and conservative estimated Token savings.
- Users choose only automatic local storage, current browser session or off; technical TTL, entry and MB controls are removed.
- Legacy 0.4.x page memory migrates only when a matching record is requested, avoiding an upgrade-time scan or translation delay.

## Safety boundaries

- Cache failure never blocks translation and never triggers an automatic Provider retry.
- Cache keys include language, mode/segment kind, Provider origin, model and Prompt version, so material translation-setting changes do not reuse incompatible output.
- API keys and original source text are not stored in the memory database. Generated translation text and non-secret metadata remain local and can be cleared independently.
- No `unlimitedStorage` permission was added.

## Install

Extract `release/FloatRead-v0.5.0.zip`, load the extracted directory at `chrome://extensions`, press **Reload** on an existing FloatRead card, and refresh the site tab. Use `release/FloatRead-v0.4.1.zip` to return to the preserved stable release.

Final automated and package evidence is recorded in `PROGRESS.md` after release verification.

# FloatRead 0.4.1 precision-reading recovery release notes

FloatRead 0.4.1 fixes two owner-reported precision-reading failures without changing the 0.4.0 page-translation, Provider, permission or pet boundaries.

## Fixes

- If a user selects text after FloatRead has already translated the page, Natural Chinese, Key Points and Explain Terms now receive the original source text instead of re-reading the visible translation.
- If the precision-reading connection is lost, the endless spinner becomes a clear retryable error. Retry creates a fresh connection.
- Stop and close update immediately even if the old precision-reading or page-translation connection is already dead.

## Install

Extract `release/FloatRead-v0.4.1.zip`, load the extracted directory at `chrome://extensions`, then press **Reload** on an existing FloatRead card and refresh the site tab.

Automated, real-Provider and package evidence is recorded in `PROGRESS.md` and `docs/REAL_API_SMOKE.md`. Authenticated-site behavior is not labeled passed until the owner observes it.

## Verification

- 133 unit tests, 2 integration tests and 19 Chromium extension tests passed.
- One bounded DeepSeek `deepseek-v4-flash` Natural Chinese request using the reported public tweet passed in 1.288 seconds and used 417 Token; its body was not retained.
- Production build, 20-entry ZIP verification, secret scans and MV3 load test passed.
- Archive: `release/FloatRead-v0.4.1.zip`, 443,831 bytes, SHA-256 `f46c9872ee611ba9142e90a4f1cb4732dcccd1f46cd5b25a26a75d62a664498d`.

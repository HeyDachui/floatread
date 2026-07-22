# Real API smoke-test record

Latest test date: 2026-07-22

This record contains no credential, Authorization header, selected private text or model output body.

## Authorized target

- Provider: DeepSeek
- Base URL: `https://api.deepseek.com`
- Model: `deepseek-v4-flash`
- Credential injection: ignored `.secrets/FloatRead-APIKEY.txt` read directly into the temporary process environment variable `FLOATREAD_TEST_DEEPSEEK_KEY`
- Fixed source text: `We reset usage limits for affected Codex users.`
- Parallel keys/requests: none

## Results

| Check                        | Result | Duration | Minimal output metadata                     |
| ---------------------------- | ------ | -------: | ------------------------------------------- |
| Connection after adapter fix | Passed |   976 ms | Text received                               |
| Ordinary generation          | Passed |   651 ms | 24 characters; 317 input / 12 output tokens |
| Streaming generation         | Passed |   772 ms | Stream completed; 24 characters             |
| Cancellation                 | Passed |   104 ms | `ABORTED`                                   |
| V2 page batch                | Passed | 1,144 ms | 2 segments; 196 input / 38 output tokens    |
| V2.1 JSON page batch         | Passed | 1,481 ms | 2 segments; 216 input / 38 output tokens    |
| V0.3 multilingual page batch | Passed |   919 ms | 2 segments; 229 input / 39 output tokens    |
| V3 streamed mixed-name batch | Passed | 1,245 ms | First item 1,111 ms; 310 input / 49 output  |
| V4 Fast page batch           | Passed | 1,909 ms | First item 1,398 ms; 405 input / 110 output |
| V4 Precise page batch        | Passed | 1,683 ms | First item 1,147 ms; 406 input / 110 output |

## Controlled initial failure and fix

The first connection request returned HTTP success but no final `content`, producing `INVALID_RESPONSE` after 808 ms. No remaining smoke request was sent in that run.

DeepSeek V4 defaults to Thinking mode and counts reasoning plus final-answer tokens against `max_tokens`. FloatRead's eight-token connection request could therefore end before final content. The DeepSeek adapter now explicitly sends `thinking: { type: "disabled" }`, appropriate for FloatRead's concise reading modes. The request-format unit test proves that this field is DeepSeek-specific. Typecheck, lint and all 16 Provider adapter tests passed before the live retest.

## Credential handling

The key was never printed, copied into source, saved in a tracked file, put into Chrome settings, or included in test output. Each shell invocation removed its temporary environment variables. The ignored `.secrets/FloatRead-APIKEY.txt` injection file remains only because the owner explicitly asked to retain this low-limit test credential; it is excluded from Git, builds and release archives.

The V2 page-batch smoke used `Account settings` plus the fixed public test sentence. The record stores only segment count and output character lengths (4 and 23), not the returned translations.

The V2.1 retest explicitly requested the Provider's JSON-object response mode after the multiline/mixed-text reliability fix. It used the same two harmless segments and retained the same no-body/no-key evidence policy.

The V0.3 retest exercised the new source/target-language prompt and cache version with the same harmless two-segment batch. It returned strict JSON for both IDs. Only segment count, output lengths (4 and 24) and Provider-reported usage (229 input / 39 output, 268 total) were retained.

The V3 retest exercised the production streaming parser and the new mixed-name rule with `ChatGPT Work => ChatGPT HelpMeWithEverything?` plus the fixed harmless Codex sentence. Both ids returned, the mixed-name result differed from its source while preserving `ChatGPT`, and the first safe item was available before the full batch completed. Only timings, lengths, success flags and Provider-reported usage were retained; no output body was saved.

The V4 comparison used six harmless X/TED/Reddit/generic representative segments. Fast and Precise each made exactly one bounded streaming request and returned all six strict ids. Fast used 515 total Token and Precise used 516. Fast completed in 1,909 ms with the first item at 1,398 ms; Precise completed in 1,683 ms with the first item at 1,147 ms. This one small-batch observation proves both modes function and that Fast stayed below two seconds, but it does **not** prove Fast is always faster: network/model variance made it 226 ms slower in this sample. Fast's deterministic throughput advantage is its larger 12-segment/12,000-character batch versus Precise's 6-segment/6,000-character batch, so a same-page long-session comparison remains a manual performance check.

After this V3 test, `.secrets/FloatRead-APIKEY.txt` remains locally present and Git-ignored because the owner explicitly requested that the low-limit test credential be retained. It is not tracked, built, packaged or scanned as repository content and must never be treated as a production credential.

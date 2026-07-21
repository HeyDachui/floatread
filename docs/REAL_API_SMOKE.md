# Real API smoke-test record

Test date: 2026-07-21

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

## Controlled initial failure and fix

The first connection request returned HTTP success but no final `content`, producing `INVALID_RESPONSE` after 808 ms. No remaining smoke request was sent in that run.

DeepSeek V4 defaults to Thinking mode and counts reasoning plus final-answer tokens against `max_tokens`. FloatRead's eight-token connection request could therefore end before final content. The DeepSeek adapter now explicitly sends `thinking: { type: "disabled" }`, appropriate for FloatRead's concise reading modes. The request-format unit test proves that this field is DeepSeek-specific. Typecheck, lint and all 16 Provider adapter tests passed before the live retest.

## Credential handling

The key was never printed, copied into source, saved in a tracked file, put into Chrome settings, or included in test output. Each shell invocation removed all three smoke-test environment variables in a `finally` block. The ignored source file remains local so the project owner can revoke or remove it.

The V2 page-batch smoke used `Account settings` plus the fixed public test sentence. The record stores only segment count and output character lengths (4 and 23), not the returned translations.

The V2.1 retest explicitly requested the Provider's JSON-object response mode after the multiline/mixed-text reliability fix. It used the same two harmless segments and retained the same no-body/no-key evidence policy.

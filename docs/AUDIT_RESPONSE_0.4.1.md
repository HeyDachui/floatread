# FloatRead 0.4.1 external AI audit response

Received: 2026-07-22

## Source identity and handoff state

- Source: an external AI audit excerpt relayed verbatim by the FloatRead owner in the current project conversation.
- Auditor identity/task id: not supplied.
- Audited source package: `release/FloatRead-v0.4.1-source-audit.zip` from commit `8194cde8933e0010a2e5f412c6ef471ac734735f`.
- Material status: received excerpt, triaged and retained as project evidence. The owner stated that omitted audit content was positive; because that content was not supplied, it is not treated as independently reviewable evidence.
- Lifecycle owner: FloatRead primary task.
- Return/closure: the three supplied findings were checked against source, tests and current product decisions. No confirmed code defect was established. One manual release gate remains open.

## Finding decisions

### Medium 2 — hidden tab / background behavior depends on real Chrome

Decision: **accepted as a verification gap; not confirmed as a defect**.

Evidence:

- `page-translator.ts` listens for the real Content Script isolated-world `visibilitychange`, stops scanning and submits no new batch while hidden.
- A batch submitted before the tab becomes hidden is intentionally allowed to finish. Background sends a text-free progress heartbeat only while that authorized Provider job exists.
- Deterministic module tests prove no new hidden-page batch and resume-on-return behavior.
- The release report truthfully records that headless Playwright did not reliably reproduce a real extension isolated-world `document.hidden` transition.

The suggested “immediately abort the unfinished batch” change is **not adopted now** because it conflicts with the owner-approved rule: avoid wasting an already submitted and potentially billed request, while limiting background cost to at most that one in-flight batch. It would also not guarantee exact Provider Token accounting if a remote service had already consumed tokens but no final usage event arrived.

Release gate:

- In normal Chrome, start a sufficiently long translation, switch away for more than 45 seconds, and compare request/Token totals before leaving and after returning.
- Expected: no new batch while hidden; no more than the one already submitted batch may finish; returning resumes only if Stop was not pressed.
- Repeat while the Manifest V3 worker is allowed to become inactive. Any continued sequence of new hidden-page requests, automatic resume after Stop, or unexplained repeated Token growth reopens this as a confirmed defect.

### Low 1 — pet animation naturalness

Decision: **accepted as a subjective UX observation; no code or security change**.

The file is `src/companion/pet-motion.ts` (not `.tsx`) plus `pet-mochi.css` and the Mochi asset. The lightweight single-image path and code-free skin boundary remain unchanged. A future controlled frame-animation route is conditional on owner feedback and must not add executable skin content.

### Low 2 — Fast/Smart/Precise performance wording

Decision: **accepted; documentation tightened**.

Current evidence already shows that Fast can be slower than Precise for one small Provider request. Fast's deterministic difference is larger page batches and therefore fewer requests on sufficiently long pages; network and Provider latency still dominate a single batch. Manual acceptance now records both timings instead of requiring Fast to win, and release wording avoids an absolute speed promise.

## Audit acceptance summary

- Confirmed security defects from the supplied excerpt: none.
- Confirmed correctness defects from the supplied excerpt: none.
- Accepted verification gap: real Chrome hidden-tab/Service Worker observation.
- Accepted product observations: pet naturalness and non-absolute Fast positioning.
- Code changed because of this excerpt: none.
- Documentation/checklist changed: yes.

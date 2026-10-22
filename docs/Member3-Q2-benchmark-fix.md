# Q2 — benchmark failure handling

Resolved 16 October 2026 in `benchmarks/member3.bench.test.ts` in the complete integrated Demo.

The old benchmark caught generation errors and failed correctness assertions, saved an issue string and exited its loop without failing the test. An injected Member 3 geometry rejection reproduced an incorrectly passing test (see `Q2-before-failure-probe.log`). This did not establish that the production generator was wrong; it established that the benchmark could conceal a regression.

The benchmark now lets unexpected errors and assertions fail the test. Every supported fixture must complete four successful runs: one warm-up and three measured runs. Known dot counts are independently specified: 4,000 for 4,000 × 2,500 mm, 4,800 for 3,000 × 4,000 mm, and 10,000 for 5,000 × 5,000 mm. Each run checks the declared count, coordinate count, both geometry validators and projected-dot count. Assertion overhead is excluded from the timing. No fixed speed threshold is imposed.

A results file is written only after all fixtures pass. Existing result files describe the last successful run; always check the current test exit status. These desktop Node timings do not establish mobile performance or installation effectiveness.

## Failure-path verification

Five deliberately broken runs now exit with code 1:

- Generator throws on its second repetition.
- Member 3 validator rejects geometry.
- Member 2 validator rejects geometry.
- Generator reports one extra dot.
- Projection omits one dot.

See `Q2-failure-detection-results.json` and the five `Q2-after-*-probe.log` files. These diagnostic failures are expected, separate from the normal passing suite.

In the Demo, the diagnostic source and logs are under `docs/benchmark-diagnostics/`; the source has a `.ts.txt` suffix so it cannot run accidentally. For reproduction, copy that source (or the workspace outputs file `Q2-benchmark-failure-probe.test.ts`) into the integrated application's `audit/benchmark-failure-probe.test.ts`. From the project directory, set `BIRDGLASS_BENCH_PROBE` to `generation`, `member3`, `member2`, `count` or `projection`, then run `npm.cmd test -- audit/benchmark-failure-probe.test.ts`. Each run must fail for the injected reason. Clear the environment variable and move the diagnostic out of the application before running the normal suite. It is intentionally excluded from the shipped test suite.

The full Demo ZIP includes the corrected benchmark and its latest successful results. Pattern rules, the application interface and algorithm version remain unchanged. The measurement-range wording issue and phone/export stress testing remain open.

Normal verification after removing the diagnostic probe: **132 tests passed in 15 files**, TypeScript checking and the production build passed.

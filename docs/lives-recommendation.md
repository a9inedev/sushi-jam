# Lives model: recommendation

Generated 2026-09-10 by `node tools/lives-report.mjs` from 0 device exports in `tools\analytics`.

**Recommendation: not yet.** The data does not meet the pre-registered minimum (fewer than 200 sessions in an arm (A 0, B 0); fewer than 7 days of data (0)). Keep both arms running.

## Numbers

| metric | A (no lives) | B (5 lives) |
| --- | ---: | ---: |
| devices | 0 |  |
| sessions | 0 | 0 |
| days of data | 0 | 0 |
| average session (min) | 0 | 0 |
| retries per fail | 0 | 0 |
| ads per session | 0 | 0 |
| fails per level | 0 | 0 |
| out-of-lives screens | 0 | 0 |

Ratios B/A: session length 0, retries per fail 0, ads per session 0.

## The rule (registered before data)

- At least 200 sessions in each arm and 7 days of data, else extend.
- Ship B only if B/A session length >= 0.9, B/A retries per fail >= 0.9 and B/A ads per session >= 1.2.
- Otherwise keep A.

See docs/lives.md for what each arm does and how the metrics are defined.

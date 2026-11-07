# CampusBite — Sprint 1 Software Test Specification (STS)

**Version:** STS v0.1 proposed before implementation, 7 November 2026  
**Scope:** F-01–F-04 / AC-01–AC-19 / TEST-01–TEST-19  
**Current status:** Test design only. **No tests have yet been executed or claimed to pass.**

The four feature contracts contain the input, precondition, operation, expected response and level for each test. This index provides stable AC coverage and evidence locations to fill in after actual execution.

| Test ID | AC | Feature | Level | Target behavior | Actual test file/name | Result/commit |
|---|---|---|---|---|---|---|
| TEST-01 | AC-01 | F-01 | API+DB | Valid role-specific login and `/me` | TBD | Not run |
| TEST-02 | AC-02 | F-01 | API | Invalid credentials | TBD | Not run |
| TEST-03 | AC-03 | F-01 | API | Anonymous protected access | TBD | Not run |
| TEST-04 | AC-04 | F-01 | API+DB | Customer forbidden Operator operation | TBD | Not run |
| TEST-05 | AC-05 | F-01 | API+DB/UI | Logout and revoked session | TBD | Not run |
| TEST-06 | AC-06 | F-02 | API+DB | Persisted active menu/prices | `backend/src/tests/menu.test.ts` | RED phase |
| TEST-07 | AC-07 | F-02 | API+DB | Sold-out and inactive items | `backend/src/tests/menu.test.ts` | RED phase |
| TEST-08 | AC-08 | F-02 | UI | Loading/empty/error, sold out, disabled control, THB price | `docs/sprints/sprint-1/f02-menu-test-procedure.md` (manual procedure; automation deferred) | Not run |
| TEST-09 | AC-09 | F-03 | API+DB/E2E | Valid order persistence | TBD | Not run |
| TEST-10 | AC-10 | F-03 | Unit/API+DB | Rejection of tampered pricing fields and correct server calculation for a valid request | TBD | Not run |
| TEST-11 | AC-11 | F-03 | API+DB | Invalid order no partial save | TBD | Not run |
| TEST-12 | AC-12 | F-03 | API+DB | Competing stock reservations | TBD | Not run |
| TEST-13 | AC-13 | F-03 | API+DB | Own order retrieval/persistence | TBD | Not run |
| TEST-14 | AC-14 | F-03 | API+DB | Cross-customer privacy | TBD | Not run |
| TEST-15 | AC-15 | F-04 | API+DB/UI | Operator incoming orders | TBD | Not run |
| TEST-16 | AC-16 | F-04 | API+DB | Pending order acceptance | TBD | Not run |
| TEST-17 | AC-17 | F-04 | Unit/API+DB | Repeated/invalid transition | TBD | Not run |
| TEST-18 | AC-18 | F-04 | API+DB | Anonymous/customer Operator denial | TBD | Not run |
| TEST-19 | AC-19 | F-04 | API+DB | Accepted state persisted/retrieved | TBD | Not run |

## Test data and execution rules

- Use an isolated test database, reproducible migrations, and synthetic seeded Customer A, Customer B, Operator accounts.
- Seed Iced Latte (`6500` satang, stock `10`), Chicken Sandwich (`8500`, stock `5`), Croissant (`4500`, stock `0`), plus an inactive item. A valid two-latte/one-sandwich order totals `21500` satang (฿215.00).
- Reset test fixtures for isolation. Record the actual build/test commands, date, commit SHA, runner, environment and pass/fail/skip totals.
- Important rule/defect work must show red (failing intended test) before implementation and green after, without weakening assertions.
- Do not substitute mock-only persistence, static screenshots or AI claims for real API/database results. UI state simulation may supplement, not replace, genuine integration tests.
- Record justified manual checks separately from automated tests.

## Product Definition of Done (Sprint 1)

1. SRS, feature inventory, traceability, System SDS, sprint plan and all feature contracts recorded before implementation with review history.
2. Every planned Sprint 1 criterion has a mapped executed test or an explicitly disclosed incomplete status.
3. UI → API → persistent database domain journey demonstrated, including normal, rule rejection and forbidden operation.
4. Meaningful unit/API/database tests, selected UI journey tests and local build pass on the released commit; failed/skipped tests disclosed.
5. Issues and bounded branches linked to teammate-reviewed PRs into sprint staging, integration checks, reviewed release PR to `main` and tag/commit.
6. README contains reproducible setup, migrations, seed, run/build/test instructions and safe demo account handoff.
7. Part F evidence includes screenshots, AC-to-test results, two real test excerpts, red/green TDD history, two sampled Issues/PRs/reviews, board state, contribution table, AI-use declaration and limitations.

**This is a design specification, not execution evidence.** Fill the actual result columns only from commands and tests you ran.

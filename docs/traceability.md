# CampusBite — Requirements-to-Feature-to-Sprint Traceability

**Version:** v0.1 proposed baseline, 7 November 2026  
**Status:** Planned coverage, not yet claimed as passing. Update this table as tests are executed and releases are accepted.

Sprint 1 acceptance and test IDs below are planned in GitHub Issues #1–#4. Detailed expected outputs and input conditions belong in the pre-implementation feature contracts and STS. Later-sprint AC/test IDs will be assigned before those features are implemented.

## Functional requirements

| Requirement | Feature | Planned sprint | Planned verification |
|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01–AC-05 / TEST-01–TEST-05 |
| FR-02 | F-02 | 1 | AC-06–AC-08 / TEST-06–TEST-08 |
| FR-03 | F-03 | 1 | AC-09–AC-12 / TEST-09–TEST-12 |
| FR-04 | F-03 | 1 | AC-13–AC-14 / TEST-13–TEST-14 |
| FR-05 | F-04 | 1 | AC-15–AC-19 / TEST-15–TEST-19 |
| FR-06 | F-05 | 2 | Menu edit, authorization and stock integration tests (IDs assigned before implementation) |
| FR-07 | F-06 | 2 | Eligible/ineligible cancellation and exactly-once stock restoration tests |
| FR-08 | F-07 | 2 | Allowed/forbidden fulfillment status transitions and customer retrieval tests |
| FR-09 | F-08 | 2 | Simulated payment transition and operator-permission tests |
| FR-10 | F-09 | 3 | Own-order/operator filtering tests |
| FR-11 | F-09 | 3 | Completed-sales aggregation and exclusion tests |

## Business rules

| Requirement | Feature | Planned sprint | Planned verification |
|---|---|---|---|
| BR-01 | F-03 | 1 | AC-09, AC-11 / TEST-09, TEST-11 (empty/duplicate lines) |
| BR-02 | F-03 | 1 | AC-11 / TEST-11 (positive integer boundary) |
| BR-03 | F-02, F-03 | 1 | AC-07, AC-11 / TEST-07, TEST-11 (inactive, sold-out, low stock) |
| BR-04 | F-03 | 1 | AC-10 / TEST-10 (tampered client prices and totals) |
| BR-05 | F-03 | 1 | AC-10 / TEST-10 (stored unit-price snapshot) |
| BR-06 | F-03 | 1 | AC-12 / TEST-12 (atomicity and competing stock orders) |
| BR-07 | F-01, F-03 | 1 | AC-03, AC-14 / TEST-03, TEST-14 (anonymous/other customer) |
| BR-08 | F-01, F-04 | 1 | AC-04, AC-16–AC-18 / TEST-04, TEST-16–TEST-18 |
| BR-09 | F-05 | 2 | Operator-only menu mutation tests |
| BR-10 | F-06 | 2 | Pending cancellation and no duplicate stock restoration |
| BR-11 | F-07 | 2 | Valid, skipped, repeated, backward transitions |
| BR-12 | F-08 | 2 | Simulated payment and wrong-role rejection |
| BR-13 | F-09 | 3 | Sales summary counts only paid-and-completed orders |

## Important non-functional requirements

| Requirement | Feature / responsibility | Planned verification window | Evidence to collect |
|---|---|---|---|
| NFR-01 | F-01, F-03, F-04, SYS-03 | Sprint 1 and regression | Auth/role/ownership integration tests; password hash inspection |
| NFR-02 | F-03 | Sprint 1 | TEST-10–TEST-12, database state before/after failed transaction |
| NFR-03 | SYS-01 | Sprint 1 | Clean migration and seed command, build/test output, tested commit |
| NFR-04 | F-03, F-04, SYS-02 | Sprint 1 local; Lab 5 cloud | Order persisted after local restart; deployed restart/redeployment retrieval |
| NFR-05 | F-09, SYS-04 | Sprint 3 | 95th percentile timing on documented ≤1,000-order dataset |
| NFR-06 | SYS-02 | Sprint 1 design; Lab 5 execution | Environment-variable design, no-real-secret check, Docker/GCP deployment and data survival |

## Sprint 1 AC-to-test planning index

| Feature | AC IDs | Planned test IDs | Current state |
|---|---|---|---|
| F-01 | AC-01–AC-05 | TEST-01–TEST-05 | Issue #1 created; specifications/tests pending |
| F-02 | AC-06–AC-08 | TEST-06–TEST-08 | Issue #2 created; specifications/tests pending |
| F-03 | AC-09–AC-14 | TEST-09–TEST-14 | Issue #3 created; specifications/tests pending |
| F-04 | AC-15–AC-19 | TEST-15–TEST-19 | Issue #4 created; specifications/tests pending |

**Coverage status:** All baseline FR/BR/NFR IDs are assigned to features or named responsibilities; no uncovered baseline requirement is currently known. **Actual test results are not yet available and must not be represented as passing.** After each test run, record actual file/test name, command, pass/fail/skip count, commit SHA, and release version in the result matrix.

# CampusBite — Lab 6 Sprint 1 UAT Handoff

**Status:** DRAFT — for independent UAT; not an execution report or acceptance decision.

## 1. Product team and contact

- **Course / Team:** CPE334 / Duo L
- **Project:** CampusBite — Campus Food Pre-Ordering and Pickup Management System (Theme 4)
- **Product team members:** 67070503481 — Lae Lae Kaung Nyunt (Mac); 67070503484 — Naing Zay Linn (Windows)
- **Repository:** https://github.com/LaeLaeKaungNyunt/cpe334-campusbite
- **Independent UAT team:** Team MT
- **Independent testers / student IDs:** Moe Htet Aung (67070503482); Thu Thu Wai (67070503486)
- **Product team contact / defect-report channel:** [AGREED CONTACT + GITHUB ISSUE/PRIVATE CHANNEL]

## 2. Baseline for this test session — MUST verify before handoff

| Field | Baseline / value to record |
|---|---|
| Application URL | https://campusbite-kpxq63g5va-as.a.run.app |
| Sprint 1 accepted-for-test features | F-01 Authentication; F-02 Menu; F-03 Customer orders; F-04 Operator acceptance |
| Sprint 1 requirements | FR-01–FR-05; BR-01–BR-08; AC-01–AC-19 |
| Source of requirements | `docs/srs.md`; `docs/sprints/sprint-1/f01-auth.md`, `f02-menu.md`, `f03-orders.md`, `f04-operator.md` |
| Previously verified Lab 5 deployed commit | `1400faa683cff2350169a86f30a25fd46a74a117` |
| Previously verified Lab 5 Cloud Run revision | `campusbite-00007-jwv` |
| **Actual tested main commit** | [VERIFY AND INSERT FULL COMMIT] |
| **Actual tested Cloud Run revision** | [VERIFY AND INSERT] |
| UAT run date/time, time zone | [INSERT; Asia/Bangkok, UTC+07:00] |
| CI/deploy evidence | [INSERT LINK TO VERIFIED RUN] |

The Lab 5 values are *historical evidence*, not proof of the version currently serving traffic. Product Team must check GitHub `main`, Cloud Run serving revision, and `/api/ready` (expect HTTP 200, `status: ready`, `db: connected`) before sharing this document. Record any redeployment before partner testing. Acceptance will apply only to the release identified above.

## 3. Sprint 1 test scope and limitations

**In:** Login/logout/current user; public active menu with THB prices and sold-out handling; customer multi-item ordering and stock validation; customer-owned history/details; operator list and `PENDING → ACCEPTED`; backend access control; persistence of saved order/status.

**Out (Sprint 2 or 3):** Public registration, menu editing, customer cancellation, preparation/ready/completed transitions, payment processing, search/filtering, reporting, real financial transactions, and delivery. Do not fail this release for those features being absent.

**Contract-specific behaviors:** Invalid order payloads return 400 (`INVALID_ORDER`); sold-out/insufficient-stock orders return 409 (`OUT_OF_STOCK`); cross-customer order detail returns 404; anonymous protected access returns 401; customer-to-operator access returns 403; accepting a non-pending order returns 409. Do not treat a frontend-only denial as sufficient evidence of backend authorization if an API check is specified.

## 4. Test accounts — safe handoff

| Label | Email | Role | How to obtain password |
|---|---|---|---|
| Customer A | `customer1@campusbite.test` | CUSTOMER | Private course-approved message from Product Team |
| Customer B | `customer2@campusbite.test` | CUSTOMER | Private course-approved message from Product Team |
| Operator | `operator@campusbite.test` | OPERATOR | Private course-approved message from Product Team |

Passwords, cookies, tokens and database credentials must **never** appear in the repository, screenshots, GitHub Issues or final PDF. Use only synthetic test orders and avoid displaying sensitive browser information in evidence.

## 5. UAT case index

| Case | Category / summary | Criterion reference | Detailed file |
|---|---|---|---|
| UAT-CB-01 | Login, wrong password, logout | FR-01; AC-01, AC-02, AC-03, AC-05 | `uat-auth-operator.md` |
| UAT-CB-02 | Active menu, prices, sold-out and inactive | FR-02; AC-06–AC-08 | `uat-menu-orders.md` |
| UAT-CB-03 | Valid customer multi-item order and authoritative total | FR-03; AC-09, AC-10 | `uat-menu-orders.md` |
| UAT-CB-04 | Invalid quantity/tampered price; mixed in-stock/sold-out cart rollback | FR-03; AC-10, AC-11 | `uat-menu-orders.md` |
| UAT-CB-05 | Own order history/details after reload/new session | FR-04; AC-13; NFR-04 (limited live check) | `uat-menu-orders.md` |
| UAT-CB-06 | Another customer/anonymous order access denied | BR-07; AC-03, AC-14 | `uat-auth-operator.md` |
| UAT-CB-07 | Customer cannot read/accept operator orders | BR-08; AC-04, AC-18 | `uat-auth-operator.md` |
| UAT-CB-08 | Operator lists and accepts once, customer sees new status | FR-05; AC-15–AC-17, AC-19 | `uat-auth-operator.md` |

**Additional scope checks:** AC-08 empty-menu and error behavior, AC-12 concurrent final-stock reservation, and NFR-04 application-restart persistence require a controlled fixture/environment or coordinated product-team action. Do not disable production database services or consume the final stock on the shared application just to demonstrate them. Record their execution and evidence separately if agreed with the partner/instructor; disclose otherwise. Existing automated tests may supplement but not substitute for independent UAT.

## 6. Execution order and dependencies

1. Product Team confirms baseline release and UAT data readiness; testers record date/time and initial menu stock.
2. Run UAT-CB-01 and UAT-CB-02.
3. Run UAT-CB-03 **once** as Customer A; write down the created **TEST_ORDER_ID**, original status (`PENDING`), item quantities, total, and stock before/after.
4. Run UAT-CB-04 and verify it does **not** create an extra order or decrease stock.
5. Run UAT-CB-05 with TEST_ORDER_ID; then UAT-CB-06 using Customer B and a new anonymous session.
6. Run UAT-CB-07 as Customer A against the same still-`PENDING` order; ensure its status remains unchanged.
7. Run UAT-CB-08 as Operator against TEST_ORDER_ID, then Customer A independently checks `ACCEPTED`.

CB-05/06/07/08 intentionally reuse the order from CB-03. They are therefore **sequenced**, not independent cases. If stock is insufficient for CB-03, mark that case **BLOCKED**, notify Product Team, and obtain a controlled test fixture or separately agreed version before continuing the dependent cases. Do not fabricate a result.

## 7. Test data and cleanup

- Seed catalog (reference only; verify live values): Iced Latte ฿65.00 initial stock 10; Chicken Sandwich ฿85.00 initial stock 5; Croissant ฿45.00 initial stock 0 (Sold Out); Seasonal Matcha Latte ฿75.00 inactive/hidden.
- CB-03 proposes Iced Latte ×2 + Chicken Sandwich ×1 = ฿215.00, reducing their **current** stock by 2 and 1 respectively if the order succeeds.
- The seed script is **idempotent and preserves existing users, menu stock and orders**. Running `npm run db:seed` does not reset used stock.
- Do not delete Cloud SQL records, truncate tables, change live stock, expose secrets, or perform a destructive cleanup without an agreed plan from the Product Team.
- Keep a written log of TEST_ORDER_ID(s), case ID, tester, timestamp, initial/final stock, and intended cleanup or retention. Test orders can remain as identified synthetic UAT records; the Product Team must document this.
- To clear the browser cart without altering server state, remove quantities through the cart/menu controls. A newly opened browser session also starts with its own session-scoped cart.

See `test-data-instructions.md` for the preparation and recording worksheet.

## 8. Results, defects and sign-off

For **every** case, partner testers enter: case ID, tester identity, exact tested commit/revision, local date/time (UTC+07), inputs, observed actual behavior, `PASS`/`FAIL`/`BLOCKED`, and screenshot/log evidence ID. Actual results must not be copied from expected results.

For each FAIL, create/communicate a reproducible finding with case/AC, steps, expected vs actual, impact-based severity, tested revision and evidence. Report BLOCKED separately with its reason. Product Team triages every finding and notifies the UAT Team before a changed deployment; the UAT Team independently retests any corrected release.

**Final UAT decision (to be supplied only by independent testers, after actual execution):**

- Decision: [Accepted / Accepted with documented minor limitations / Not Accepted]
- Product / Sprint scope: CampusBite Sprint 1 (F-01–F-04)
- Exact accepted commit and deployed revision: [INSERT]
- Independent testers and team: [INSERT]
- Date/time: [INSERT]
- Failed/blocked cases and known minor limitations: [INSERT OR NONE AFTER VERIFICATION]
- Evidence supporting decision: [INSERT]

No acceptance is claimed in this draft.

# F-05 Menu and Stock Administration

**Sprint 2 · Deliverable 2 · Draft v0.2 · Author 3481 · Duo L proposed decisions**

F-05 lets an Operator maintain the single café’s catalog and available stock. FR-06 covers creation, editing, activation, deactivation, price changes, and stock adjustments. BR-09 requires the backend to authorize every mutation. F-02 and F-03 continue to govern public visibility, checkout, and historical prices under FR-02, BR-03–BR-06, DEC-03, and DEC-06. NFR-01, NFR-02, and NFR-04 apply to access, integrity, and durability.

Source documents: [SRS](../../srs.md), [feature inventory](../../features.md), [System SDS](../../system-sds.md), [traceability](../../traceability.md).

## 1. Workflow and feature SDS

1. An Operator signs in through F-01 and opens **Menu administration** at `/operator/menu` from the operator navigation. The page lists active and inactive items with names, prices in THB, available quantities, and activation state.
2. The Operator creates an item or edits the details, price, available stock, or activation state of an existing item. Creation always saves an inactive item. The Operator publishes it in a separate edit. An active item at zero stock appears as **Sold Out**.
3. The UI sends a credentialed JSON request. Express resolves the session, enforces the Operator role, validates the request, and applies one atomic database change. The UI disables the relevant form while saving and replaces its row with the server response on success. On a validation or network failure, it shows the error and retains the draft. On a stock conflict, it reloads the saved quantity and requires the Operator to review and submit the intended quantity again.
4. On the next public menu fetch, customers and guests see the newly saved active entries and current prices. Existing carts still go through server-side checkout validation. Existing orders retain saved unit prices, line totals, and order totals.

Use the existing React routing and session behavior for loading, empty, error, sign-in, and forbidden states. Show price in THB with at most two input decimal places and convert it to integer satang using decimal digits. Show available stock as whole units. Staff have café-wide access through the Operator role. Menu items have no per-user ownership. A Customer or guest cannot open the administration data through a direct request.

## 2. API contract

| Method and path | Request | Success |
|---|---|---|
| `GET /api/v1/operator/menu-items` | Operator session | `200`, `{ data: MenuAdminItem[] }`, includes active and inactive entries, ordered by name then ID |
| `POST /api/v1/operator/menu-items` | `name`, `priceSatang`, `stockQuantity` required. `description` optional. The server explicitly writes `isActive: false` | `201`, `{ data: MenuAdminItem }` |
| `PATCH /api/v1/operator/menu-items/:id` | One or more of `name`, `description`, `priceSatang`, and `isActive` | `200`, `{ data: MenuAdminItem }` |
| `PATCH /api/v1/operator/menu-items/:id/stock` | Exactly `stockQuantity` (the new absolute available quantity) and `expectedStockQuantity` (the last observed available quantity) | `200`, `{ data: MenuAdminItem }` |

`MenuAdminItem` contains `id`, `name`, `description` (string or null), `priceSatang`, `stockQuantity`, `isActive`, `createdAt`, and `updatedAt`. Timestamps use ISO 8601 UTC. The public `GET /api/v1/menu-items` retains its existing active-only response and computes `isAvailable` from stock greater than zero. These routes use the existing `/api/v1/operator` router and its server-side role guard.

```json
{"name":"Iced Cocoa","description":"Unsweetened cocoa","priceSatang":6500,"stockQuantity":8}
```

```json
{"priceSatang":7000,"isActive":true}
```

```json
{"stockQuantity":6,"expectedStockQuantity":8}
```

### Validation and error responses

| Rule | Contract |
|---|---|
| Request shape | JSON object with the keys defined for that route. Reject malformed JSON, absent body, arrays, null, empty PATCH, unknown fields, `isActive` on create, stock fields on the item PATCH, and metadata fields or missing fields on the stock PATCH. Omitted fields on the item PATCH keep their saved values. |
| `name` | Trim leading and trailing whitespace. Require 1–100 Unicode code points after trimming. Duplicate display names are allowed and the UUID identifies each item. |
| `description` | Omission on create or explicit null stores null. Trim text and normalize a blank string to null. Limit trimmed text to 500 Unicode code points. |
| Price and stock | `priceSatang`, `stockQuantity`, and `expectedStockQuantity` must be nonnegative JSON numbers satisfying `Number.isSafeInteger`. Zero is valid for all three. The current PostgreSQL `integer` columns impose a separate inclusive storage maximum of 2,147,483,647. Reject safe integers above that maximum before any database write. |
| `isActive` | Boolean on the item PATCH. The create handler always persists false explicitly. An activation-only PATCH preserves the existing item ID, stock, and order references. |
| Item ID | Accept the PostgreSQL UUID text shape (8-4-4-4-12 hexadecimal digits), including existing seed IDs. |

All errors use `{ "error": { "code": "...", "message": "..." } }`. `400 INVALID_MENU_ITEM` covers malformed bodies, parser errors, and invalid field values, including negative, fractional, nonnumeric, or unsafe integers. `400 MENU_VALUE_OUT_OF_RANGE` covers nonnegative safe integers above the current storage limit. `400 BAD_REQUEST` covers malformed IDs. Missing or invalid sessions return `401 UNAUTHORIZED`, and authenticated Customers receive `403 FORBIDDEN`. A valid missing item ID returns `404 MENU_ITEM_NOT_FOUND`. A stale stock value returns `409 STOCK_CHANGED`. A requested stock quantity that leaves insufficient room for outstanding cancellable reservations returns `409 STOCK_LIMIT_EXCEEDED`. Each failed request leaves every field unchanged. Unexpected failures return a sanitized `500 INTERNAL_SERVER_ERROR`.

## 3. Data contract and integration

- Reuse `MenuItem` and its existing price/stock CHECK constraints. The create API explicitly writes `isActive: false`; the existing Prisma default `true` still applies to other creation paths such as seeds when they omit the field. ID and timestamps are server-managed. Deactivation changes `isActive` while retaining the row and its `OrderItem` references.
- `stockQuantity` is the quantity available for new orders after reservations. The stock PATCH, which can also adjust inactive items, replaces it only if the saved quantity still equals `expectedStockQuantity` at write time. Under the same transaction and row lock or equivalent guarantee, check the expected value, check cancellation headroom, and write the new quantity. The item PATCH updates only supplied metadata fields and leaves available stock intact.
- F-03 checkout decrements stock conditionally. For price consistency, reservation and price selection must use the same locked row version. The current checkout reads price before reserving stock, so Sprint 2 integration must read price as part of the reservation or lock the menu rows in stable ID order before pricing. A checkout that reserves before the price change uses the old price. A checkout that reserves after the change uses the new price and rechecks activation and availability.
- F-06 restores stock exactly once for pending orders. When changing available stock, lock the menu row and ensure the target plus quantities on outstanding `PENDING` order lines for that item fits in the integer column. Coordinate transaction ordering with F-06 so cancellation restores reserved units even if a menu item has since become inactive. Checkout and cancellation must preserve the stock invariant under concurrency.
- PostgreSQL order totals and line totals also use integer columns. F-03 currently checks JavaScript safe integers but can still exceed the column limit. Sprint 2 integration must reject any line or aggregate over 2,147,483,647 as `400 INVALID_ORDER` and roll back all reservations. Single units at the storage boundary remain representable.
- Order history uses `OrderItem.unitPriceSatang`, `OrderItem.lineTotalSatang`, and `Order.totalSatang`. Order readers currently join the live menu name, so a rename can appear on historical orders. Customer ownership, public menu response, stock reservation on checkout, F-04 acceptance and estimates, and payment state retain their existing behavior.

Baseline modules: [Prisma schema](../../../backend/prisma/schema.prisma), [public menu API](../../../backend/src/routes/menuRoutes.ts), [operator router](../../../backend/src/routes/operatorRoutes.ts), [checkout and history API](../../../backend/src/routes/orderRoutes.ts), [React routes](../../../frontend/src/App.tsx), [menu UI](../../../frontend/src/features/menu/MenuPage.tsx).

## 4. Acceptance criteria

1. **S2-F05-AC01** · An Operator creates inactive items and edits their details, price, and available quantity. Identical names can be stored under distinct UUIDs. The Operator list includes inactive entries. Changes survive a reload and application restart. `FR-06, NFR-04`
2. **S2-F05-AC02** · Activation publishes the item, deactivation hides it, and an active zero-stock item remains visible as Sold Out and cannot be purchased. `FR-06, FR-02, BR-03`
3. **S2-F05-AC03** · The backend rejects unauthenticated, wrong-role, malformed, out-of-range, and missing-resource requests with the specified status and no write. `FR-06, BR-09, NFR-01`
4. **S2-F05-AC04** · The stock endpoint sets an absolute quantity only when the expected value matches at write time. Conflicts leave the item unchanged. Stock edits preserve committed reservations and allow valid cancellation restores. `FR-06, BR-06, BR-10, NFR-02`
5. **S2-F05-AC05** · Checkout uses the price at reservation, saves price snapshots, and rejects overflow atomically. Previously saved prices and totals survive later menu edits. `FR-06, BR-04–BR-06, NFR-02`
6. **S2-F05-AC06** · The operator workflow shows saved fields and safe error feedback, and prevents duplicate form submission while a request is in flight. `FR-06, BR-09`

## 5. Software Test Specification

Use isolated PostgreSQL fixtures, authenticated Supertest agents for an Operator and Customers A/B, and a guest agent. Start each case from a clean fixture. Use separate database sessions and a transaction barrier to force each specified concurrency order. Verify relevant database rows directly and compare full snapshots after rejected writes.

| Test ID | AC | Level and input / action | Expected outcome | Status |
|---|---|---|---|---|
| S2-F05-T01 | AC01, AC02 | API + DB. POST the example twice. Apply the item PATCH and the stock PATCH examples to the first UUID. Restart the app on the same database and fetch both menus. | Both POSTs return `201` with distinct UUIDs and inactive rows. Both PATCHes return `200`. After restart only the first UUID is public, with price 7000 and stock 6. The second row stays inactive with its original values. | Designed / Not run |
| S2-F05-T02 | AC02 | API + UI. Use the stock PATCH to set an active item from 6 to 0 with expected 6. Reload `/menu`, try checkout with quantity 1, then deactivate with the item PATCH and try checkout again. Reactivate at zero. | Public API reports `isAvailable: false` at zero. Menu shows Sold Out with ordering disabled. Both checkout attempts return `409 OUT_OF_STOCK`. Deactivation hides the item and reactivation at zero restores its Sold Out listing. Stock and existing orders stay intact. | Designed / Not run |
| S2-F05-T03 | AC03 | API + DB. Guest, expired session, and Customer A send the admin GET, valid POST, valid item PATCH, and valid stock PATCH. Customer A also sends a body with `role: "OPERATOR"`. | Guest and expired session receive `401`. Customer receives `403` regardless of supplied role. No private catalog response and no write. | Designed / Not run |
| S2-F05-T04 | AC01, AC03 | API + DB. Exercise omitted/null/blank and 500-code-point descriptions, trimmed 1/100-code-point names, and boolean activation. Try blank/101-code-point names, 501-code-point description, wrong field types, empty/invalid JSON, missing required fields, `isActive: true` on POST, stock fields on the item PATCH, and a stock PATCH with an extra metadata field or either required field omitted. On both PATCH routes use a malformed ID and an absent UUID. | Valid cases persist with trimmed names and descriptions and null for omitted or blank descriptions on create. Invalid inputs return `400 INVALID_MENU_ITEM`. Malformed ID returns `400 BAD_REQUEST` and absent UUID returns `404 MENU_ITEM_NOT_FOUND`. Rejected requests perform no write. | Designed / Not run |
| S2-F05-T05 | AC04 | API + DB. Start at stock 2. Hold Customer A’s one-unit reservation open, submit a stock PATCH with expected 2 and target 5, then commit the reservation. In a fresh fixture hold a stock PATCH to 0 open while checkout starts, then commit the PATCH. Finally, send two simultaneous stock writes with expected 2 and distinct targets 4 and 6. | With checkout first, PATCH returns `409 STOCK_CHANGED`, stock is 1, and the order persists. With PATCH first, checkout returns `409 OUT_OF_STOCK` with no order or decrement. With competing stock writes, one returns `200` and the other `409 STOCK_CHANGED`; the final quantity is the successful target. | Designed / Not run |
| S2-F05-T06 | AC04 | API + DB with F-06. Create a pending order that reserves the last unit. Try setting available stock to 2,147,483,647 with expected 0. Then set it to 2,147,483,646, deactivate the item and cancel the pending order twice. | First edit returns `409 STOCK_LIMIT_EXCEEDED`; second saves. The first cancellation restores one unit to 2,147,483,647 and the second restores zero. The item remains inactive and no quantity wraps. | Designed / Not run |
| S2-F05-T07 | AC05 | API + DB. A buys two at 6500 satang. Rename the item and change the price to 7000, then A buys two more. Read both orders as A and attempt to read A’s first order as B. Use fresh fixtures to force each commit order between a price edit and a checkout reserving stock. | First order retains 6500 per unit and 13000 line/order totals. Second uses 7000 and 14000. Both reads show the current name under the existing live-name join. Checkout-first snapshots 6500 and price-edit-first snapshots 7000. B gets `404 ORDER_NOT_FOUND`. | Designed / Not run |
| S2-F05-T08 | AC05 | API + DB. Buy two units at 2,147,483,647 each. Separately buy two different one-unit items priced at 2,147,483,647 and 1. Then buy one unit of the maximum-price item by itself. | Overflow attempts return `400 INVALID_ORDER` with no order and every reservation rolled back. The one-unit boundary request returns `201` with the maximum representable total. | Designed / Not run |
| S2-F05-T09 | AC06 | Browser + API + DB. Open `/operator/menu` as Operator, create and edit a fixture, attempt two immediate submits while the first is in flight, then use a second session to create a stale stock edit. Open the admin route as a Customer. | One create request is sent. The saved item appears with server values. The conflict displays feedback and requires review of the refreshed stock before resubmitting. Customer sees the forbidden state and no admin records. | Designed / Not run |
| S2-F05-T10 | AC01, AC03 | API + DB. For each applicable numeric field test 0 and 2,147,483,647, then -1, 1.5, `"10"`, null, 2,147,483,648, 9,007,199,254,740,991, and 9,007,199,254,740,992. Use matching saved expectation and no pending reservations for valid stock cases. | Zero and the storage maximum succeed. Negative, fractional, string, null and unsafe integers return `400 INVALID_MENU_ITEM`. The two safe values above the storage maximum return `400 MENU_VALUE_OUT_OF_RANGE`. Each failure leaves stored data unchanged. | Designed / Not run |

## 6. Definition of Done

- [ ] Record teammate review of the API and the F-03/F-06 integration design.
- [ ] The secure operator UI/API workflow uses real PostgreSQL persistence and all F-05 criteria have passing evidence.
- [ ] Run the existing build and test commands. Recheck F-01 permissions, F-02 publication, F-03 stock/price/ownership, F-04 acceptance, and F-06 restoration with the integrated implementation.
- [ ] Record the tested commit, commands, results, concurrency setup, and browser evidence in the implementation review. Update shared traceability after review.

## 7. Baseline differences and integration dependencies

- The API explicitly creates inactive items because the current Prisma model defaults to active. Existing seed behavior and rows stay as they are.
- Safe-integer validation and PostgreSQL storage have different upper bounds. The contract uses the current storage limit. Persisting every nonnegative JavaScript safe integer would require a separately reviewed storage and API change that also covers checkout totals.
- F-03 must coordinate pricing with stock reservation and enforce the database range in order calculations. F-06 must coordinate stock restoration with the stock PATCH under the same inventory invariant. These are integration dependencies for implementation.

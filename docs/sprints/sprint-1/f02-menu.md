# F-02 — Menu Browsing Contract

**Contract version:** v0.1 proposed, 7 November 2026  
**GitHub Issue:** #2  
**Lead / reviewer:** 67070503484 / 67070503481  
**Requirements:** FR-02, BR-03, NFR-03; provides data for F-03  
**Status:** Designed before implementation; not yet verified

## Feature-level SDS and behavior

Customers browse active menu items from the persistent database. Active products with zero stock remain visible with a **Sold Out** label and cannot be selected for purchase. Inactive products are omitted. A card shows name, description (when supplied), THB price and availability. A public menu read is permitted, but placing an order requires Customer authentication.

## API specification

| Method/path | Request | Success | Failure |
|---|---|---|---|
| `GET /api/v1/menu-items` | No authentication required | `200`, `{ "data": [{ "id": "...", "name": "Iced Latte", "priceSatang": 6500, "stockQuantity": 10, "isAvailable": true }] }` | `500` safe generic error for unexpected database failure |

Only active items appear. `isAvailable = isActive && stockQuantity > 0`; an empty active menu returns `200` with `data: []`. The API never exposes internal cost or admin-only fields.

## UI and data specification

- **UI:** `/menu` shows a responsive list/grid, `฿65.00` for `6500` satang, cart controls for available items only, an explicit **Sold Out** badge for zero stock, and loading/empty/error states. On API failure show a safe retry message rather than stale successful data.
- **Data:** `MenuItem(id,name,description,priceSatang,stockQuantity,isActive,createdAt,updatedAt)` with constraints `priceSatang >= 0`, `stockQuantity >= 0`. Seed Iced Latte, Chicken Sandwich and a sold-out Croissant with synthetic values. Baseline migration is shared with F-03.
- **Dependencies:** Database/migrations and seed; no new authentication changes (public menu read). F-03 uses returned stable item IDs but revalidates prices/stock on the server at submission.

## Acceptance criteria and STS

| AC | Observable criterion | Test ID / level | Preconditions, action, expected outcome |
|---|---|---|---|
| AC-06 | Menu shows persisted active items with accurate prices. | TEST-06 / API+DB | Seed active menu items; GET endpoint; verify names, satang prices and record data. |
| AC-07 | Sold-out active items cannot be selected; inactive entries are hidden. | TEST-07 / API+selected UI | Seed active stock=0 and inactive stock>0; verify inactive absent, sold-out reported/unselectable. |
| AC-08 | UI handles loading, empty and error states. | TEST-08 / UI (automated where practical; manual supplemental) | Simulate delayed/empty/failing menu response; verify visible and accessible feedback. |

## Negative/boundary behavior

Empty menu is valid; a database outage must not be represented as a valid empty menu. A UI-disabled item is not a security control: F-03 independently rejects unavailable products. No menu write endpoints in Sprint 1.

## Definition of Done

- [ ] Contract and test specifications recorded before implementation.
- [ ] Migration/seed and actual API read operate against PostgreSQL.
- [ ] Menu UI renders accurate price, stock and error states.
- [ ] TEST-06–TEST-08 executed; automated versus manual results distinguished.
- [ ] Reviewed feature PR merged into staging; documentation and evidence updated.


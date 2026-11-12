# F-02 AC-08 UI verification procedure

This is the manual AC-08 procedure. The frontend currently has no UI test
runner or browser automation dependency. Checks not listed in the execution
record are pending; record further results only after running them against the
implemented feature.

## Setup

1. Start the application using the repository's documented local run command.
2. Open `/menu` in a browser with DevTools available.
3. Use the browser Network panel to control or inspect the
   `GET /api/v1/menu-items` request and response. Use only synthetic data.

## Checks and expected results

| State | Procedure | Expected result |
|---|---|---|
| Loading | Throttle the menu request or hold its response. | A visible, accessible loading message or indicator appears until the request resolves. |
| Empty | Return HTTP 200 with `{ "data": [] }`. | A clear empty-menu message appears; no item card or purchase control appears. |
| API failure and retry | Return HTTP 500, then restore the API and activate the UI retry action. | A safe error and retry action appear; retry issues another request and displays the returned menu. Failure is not shown as an empty menu. |
| Sold Out | Return an active item with `stockQuantity: 0` and `isAvailable: false`. | The item remains visible with a clear “Sold Out” indicator. |
| Disabled purchase control | Inspect and try to activate the sold-out item's purchase control. | Purchase control is disabled and cannot add/select the sold-out item. |
| THB formatting | Return an item with `priceSatang: 6500`. | The displayed price is exactly `฿65.00`. |

Automated UI coverage is deferred until a suitable frontend browser-test setup
is available. Do not record any manual check as passed before performing it.

## Execution record — 7 November 2026

The development servers were started with `npm run dev`. An HTTP smoke check
using `curl.exe` returned HTTP 200 for `/menu` (Vite HTML application shell)
and HTTP 200 for `/api/v1/menu-items` through the Vite proxy. The real API
response contained three active records: Chicken Sandwich, Croissant
(`stockQuantity: 0`, `isAvailable: false`) and Iced Latte (`priceSatang: 6500`,
`isAvailable: true`); the inactive Seasonal Matcha Latte was absent. This
confirms the route and database-backed proxy response, but does not confirm
React rendering in a browser.

Browser visual/interaction checks remain **not run**: loading, empty, error and
retry states, Sold Out badge/control behavior, displayed `฿65.00`, and mobile
layout. No temporary database fixture was changed during the HTTP smoke check.

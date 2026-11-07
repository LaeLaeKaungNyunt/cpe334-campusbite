# F-02 AC-08 UI verification procedure

This procedure is the manual AC-08 fallback while the frontend has no UI test
runner, browser automation dependency, or `/menu` implementation. These checks
are defined, not executed; record results only after running them against the
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

Automated UI coverage is deferred until a menu screen and frontend browser-test
setup exist. Do not record any manual check as passed before performing it.

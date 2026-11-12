# F-01 — Authentication and Authorization Contract

**Contract version:** v0.1 proposed, 7 November 2026  
**GitHub Issue:** #1  
**Lead / reviewer:** 67070503481 / 67070503484  
**Requirements:** FR-01, BR-07, BR-08, NFR-01; enables F-03 and F-04  
**Status:** Designed before implementation; not yet verified

## Feature-level SDS and behavior

The system supports seeded `CUSTOMER` and `OPERATOR` accounts. A user logs in with email/password, receives a server-issued session cookie, requests their own identity through `/auth/me`, and logs out. Server-side middleware resolves the session and role; it never trusts a submitted role or user ID for authorization. Customers cannot use operator operations. No self-registration, password recovery or email verification in Sprint 1.

**Proposed session decision:** Generate a cryptographically random opaque token, store only its SHA-256 hash in the `Session` table, send token in `HttpOnly`, `SameSite=Lax` cookie, expire after 24 hours and revoke/remove on logout. Use `Secure` for HTTPS deployment. Hash passwords with a standard password-hashing library (e.g., bcrypt with a documented work factor). Error responses must not distinguish an unknown email from a wrong password.

## API specification

| Method/path | Request | Success | Failure |
|---|---|---|---|
| `POST /api/v1/auth/login` | `{ "email": "...", "password": "..." }` | `200`, safe `{ "data": { "id": "...", "email": "...", "role": "CUSTOMER" } }`, session cookie | `400` malformed, `401` invalid credentials |
| `GET /api/v1/auth/me` | Session cookie | `200`, safe identity and role | `401` absent/expired/invalid cookie |
| `POST /api/v1/auth/logout` | Session cookie | `200`, revoked session and cleared cookie | `401` for no active session (documented choice) |

Never return password hashes, tokens, internal exceptions or database details. Authorized operations use the shared middleware. `401` means not authenticated; `403` means authenticated but wrong role; a private order belonging to another customer is treated as `404` by F-03.

## UI and data specification

- **UI:** `/login` with email/password inputs, required-field feedback, pending state and generic invalid-login message. Role-aware navigation after login. Logout action returns to a logged-out screen; protected route access redirects to login without claiming backend authorization.
- **Data:** `User` (unique normalized email, salted password hash, enum role) and `Session` (unique token hash, user FK, expiry). Initial migration and synthetic seed required. Client never receives sensitive columns.
- **Dependencies:** Database, session cookie handling, backend middleware. Operator and order APIs reuse the same role guard.

## Acceptance criteria and STS

| AC | Observable criterion | Test ID / level | Preconditions, action, expected outcome |
|---|---|---|---|
| AC-01 | Valid seeded accounts authenticate and `/me` returns correct identity/role. | TEST-01 / API+DB | Seed Customer and Operator; log in each; verify `200`, correct role and session-backed `/me`. |
| AC-02 | Invalid credentials create no authenticated session. | TEST-02 / API | Wrong password/unknown email; verify `401`, generic error, no usable session. |
| AC-03 | Anonymous protected operations disclose no private data. | TEST-03 / API | No cookie; request `/auth/me` and protected order endpoint; verify `401` and no private data. |
| AC-04 | Customer cannot use operator-only operations. | TEST-04 / API+DB | Customer cookie; call operator order list or acceptance; verify `403`, no changes. |
| AC-05 | Logout ends the current session. | TEST-05 / API+DB + selected UI | Log in, log out, replay former cookie; verify session revoked, `/me` `401`; UI becomes logged out. |

## Negative/boundary behavior

Empty input, invalid email shape, invalid credentials, absent cookie, expired/revoked cookie and wrong role must produce safe responses. Session expiry is evaluated server-side; cookie expiry alone is insufficient. Do not log raw credentials or session tokens.

## Definition of Done

- [ ] Contract and tests recorded in Git history before implementation.
- [ ] Migration and synthetic accounts reproducible; no plaintext password.
- [ ] Login, logout, current-user and backend role guards work.
- [ ] TEST-01–TEST-05 executed, reviewed and mapped to AC-01–AC-05.
- [ ] Meaningful failing-before/passing-after test evidence retained.
- [ ] Teammate-reviewed feature PR merged into `sprint-1-staging`; integration checks pass.
- [ ] README/setup and evidence table updated; known failures/skips disclosed.


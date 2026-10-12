# Ekyama validation portal

React + TypeScript (Vite) front end for validators. It talks to a FastAPI service that owns the database
(`../schema.sql`). Pages: **Sign in / Create account**, **Work** (correct the Luganda translation, earn per sentence),
**Profile** (earnings, mobile money accounts, cash out, history).

```bash
npm install
cp .env.example .env        # VITE_USE_MOCK=true runs against an in-browser fake API, no backend needed
npm run dev
```
Set `VITE_USE_MOCK=false` and `VITE_API_URL` to use the real API. Enable CORS on the API for the portal's origin.

## Auth
Access token: kept in memory, sent as `Authorization: Bearer`. Refresh token: stored in `localStorage`, exchanged at
`/auth/refresh` on any 401 (one refresh at a time), and the retried request is transparent to the page.
Refresh tokens **rotate**: every refresh returns a new pair and revokes the old token; presenting an already-revoked
token revokes its whole `family_id`. Hash tokens at rest (`refresh_tokens.token_hash`). Suggested lifetimes: access 15 min, refresh 30 days.
Trade-off: `localStorage` is readable by injected scripts; an httpOnly cookie for the refresh token is safer if the API and portal share a site.

## API contract (JSON; errors are `{"detail": "message"}` with a 4xx status)
| Method & path | Body | Response |
|---|---|---|
| `POST /auth/register` | `{full_name, email, password}` | `{access_token, refresh_token}` |
| `POST /auth/login` | `{email, password}` | `{access_token, refresh_token}` |
| `POST /auth/refresh` | `{refresh_token}` | new `{access_token, refresh_token}` |
| `POST /auth/logout` | `{refresh_token}` | 204 (revoke) |
| `GET /me` | | `{id, email, full_name, role}` |
| `GET /me/balance` | | `{total_earned_ugx, available_ugx, pending_ugx, paid_out_ugx, validated_count, min_cashout_ugx}` from view `user_balances` + `reward_settings` |
| `GET /work/next` | | `{id, noisy_english, attempted, difficulty, reward_ugx}` or **204** if none left |
| `POST /work/{id}/submit` | `{clean_lug}` | `{reward_ugx}` |
| `POST /work/{id}/skip` | | 204 (release the claim) |
| `GET/POST /me/payment-methods` | `{provider: "mtn"\|"airtel", phone_number: "+256…", account_name}` | list / created item (first one becomes default) |
| `DELETE /me/payment-methods/{id}` | | 204 (soft delete) |
| `POST /payouts` | `{payment_method_id}` | the created payout (cashes out the whole available balance) |
| `GET /payouts` | | `[{id, amount_ugx, status, requested_at, provider, phone_number, account_name}]` |

**Admin (needed for your manual flow; not in the portal yet), role `admin` only:**
`GET /admin/payouts?status=pending`, `POST /admin/payouts/{id}/mark-paid {provider_reference}`, `POST /admin/payouts/{id}/reject {reason}`.

## Rules the API must enforce (the UI is not a security boundary)
* **Next sentence** (claims it for ~15 min, so two people never get the same one):
  `select id from sentences where validated_by is null and (claimed_by is null or claim_expires_at < now() or claimed_by = :me) order by cost desc limit 1 for update skip locked`, then set `claimed_by`, `claim_expires_at`.
* **Submit:** only if `claimed_by = me` and not yet validated. Set `clean_lug`, `validated_by`, `validated_at`,
  `reward_ugx = greatest(min_reward_ugx, round(cost * rate_ugx))` (snapshot from `reward_settings`), clear the claim. Never trust a client-sent reward.
* **Cash out** (one transaction): lock the user's row, require `available_ugx >= min_cashout_ugx` and no pending payout (a unique index backs this),
  insert the payout copying provider/phone/name from the chosen method (must belong to the user), then
  `update sentences set payout_id = :id where validated_by = :me and payout_id is null`.
* **Mark paid:** `status='paid'`, `provider_reference`, `processed_by/at`; `update sentences set paid_status = true, paid_at = now() where payout_id = :id`.
  **Reject:** `status='rejected'`, reason; `update sentences set payout_id = null where payout_id = :id` so the money becomes available again.
* Hash passwords with argon2 or bcrypt; rate-limit `/auth/*`; check `is_active` on every login and refresh.
* Account-name mismatch is allowed by design: `account_name` is what the network registered for the number, and the payout keeps a snapshot of it.

## Not included
Admin screens, the reviewer/"verified" workflow, the FastAPI service itself, and automated tests. This code has not been installed or run yet.

# Tus Frases Inspiradoras · Aventuras bíblicas

Production project: `prj_bxA5LjmOjCzVdMlqCpWjYuO2FxKT`, root `games-platform`.
Public URL: https://tusfrasesinspiradoras.vercel.app/juegos

## Architecture

`api/portal.js` validates purchase codes on the server and serves the authenticated game HTML, JavaScript and illustrations from `private/games`. Public output contains only the gate UI, shared styles, fonts and icons. Every private response uses `private, no-store` and checks the signed session, including direct function requests. All six stories are selected through the URL hash, including `#jose`.

The customer enters a reusable six-character code. The server compares its HMAC against `private/access-codes.json`, and issues a Secure, HttpOnly, SameSite=Lax cookie valid for 90 days. Removing a code or setting its `active` flag to false also invalidates its sessions on the next request. Codes work across devices; game progress remains local to each browser. Sharing a code also shares access. This is purchase-code access, not a customer identity or payment system.

## Secrets and persistent attempt limits

`TFI_ACCESS_SECRET` is a server-only Vercel secret. Never commit it or plaintext purchase codes. Code hashes use `HMAC-SHA256(secret, "purchase:" + uppercaseCode)`; session signing uses a separate HMAC context.

`BLOB_READ_WRITE_TOKEN` is provisioned on the linked project for the private `tusfrases-acceso` Blob store. Failed configuration or storage requests fail closed. Attempt counters are private objects keyed by a server HMAC of the requester IP. Consistent reads and conditional writes protect counters across instances. Limits: 8 attempts per 15 minutes and 60 per UTC day, including successful attempts. Raw IPs and plaintext codes are never written to counters. Changing devices or clearing browser storage does not reset the IP counter.

## Adding a code batch

Use cryptographically random six-character strings with letters and digits (exclude ambiguous characters such as I, L, O, 0 and 1). Deduplicate against the HMAC catalog, append `{ id, hash, active: true }` records, securely deliver the corresponding plaintext codes, and deploy. The current format supports 5,000 entries without architectural changes. Keep the signing secret stable so previously delivered codes continue working. Keep code-generation operations server-side; the plaintext workbook belongs exclusively to the seller.

## Games and visual design

Twelve games, three levels each, thirty-six stars. José adds a constrained allocation puzzle and a color-pattern weaving game. All images used from purchased PDFs exclude the story text. Plus Jakarta Sans is served locally in five weights under the included OFL license. Reduced-motion preferences and keyboard focus styles are supported.

Old `/juegos` files in the sales app redirect to the canonical portal. The sales app and its Vercel project remain separate from this deployment. Historical deployment snapshots and public repository history are outside this purchase-code gate; restrict their access separately if distributing those URLs.

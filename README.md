# Public and private pages with Clerk

This example uses Astro server rendering and Clerk v4. Existing tutorial pages,
including `/`, remain public. `/pricing` is a public marketing page.

| Route | Access |
| --- | --- |
| `/Auth/login` | Public Clerk sign-in/sign-up UI |
| `/Auth/dashboard` | Signed-in users; otherwise redirects to login |
| `/Auth/logout` | Signed-in users; button ends the actual Clerk session |
| `/API/me` | Signed-in users; otherwise JSON HTTP 401 |

## Why the old demo was unsafe

The old login embedded credentials in browser JavaScript and trusted a
`sessionStorage` flag. Anyone could set that flag. Hiding dashboard HTML with CSS
also delivered the HTML before checking authentication. Authentication pages now
live under `/Auth/`, and navigation and Clerk redirects use that same prefix.

The replacement checks `Astro.locals.auth()` in server frontmatter before rendering.
The API independently checks `locals.auth()`. Private responses use
`Cache-Control: private, no-store`. Keep `output: "server"` and the Node adapter.
Never prerender a private page. Clerk middleware initializes authentication but
is not itself a route guard. Clerk v4 removed `createRouteMatcher`; checks belong
on the protected resource, not only in layouts or client UI.

## Adding another private page

Put this before any private data queries in the page's frontmatter:

```astro
---
export const prerender = false;
Astro.response.headers.set("Cache-Control", "private, no-store");
const { isAuthenticated, userId } = Astro.locals.auth();
if (!isAuthenticated || !userId) {
  return Astro.redirect("/Auth/login");
}
// Fetch data here, scoped to userId.
---
<h1>Private page</h1>
```

New routes are NOT automatically private. Add the guard to each private page,
API endpoint, and server action. Protect download handlers too; files in `public/`
are public. UI controls such as `Show` only control presentation.

## Authentication versus authorization

Signing in proves identity; it does not grant access to every customer's data.
For a personal SaaS, scope every database read/update/delete to the verified
`userId`. For example, with a future Prisma database:

```ts
const project = await db.project.findFirst({
  where: { id: requestedProjectId, ownerId: userId },
});
if (!project) return new Response("Not found", { status: 404 });
```

That is illustrative database code, not a database included in this sample.
For team SaaS, require a verified active organization, scope queries to that
organization, and check the needed server-side permission. Never trust a submitted
owner ID, organization ID, role, or paid-plan flag. Enforce subscription access
server-side using your billing provider's verified state.

This sample is read-only. When adding writes, validate input, enforce ownership
and permissions, use CSRF protection for cookie-authenticated mutations, and add
appropriate rate limits. Keep GET requests free of mutations.

## Configuration and running

Keep your existing `.env` with `PUBLIC_CLERK_PUBLISHABLE_KEY` and
`CLERK_SECRET_KEY`. Never expose the secret with a `PUBLIC_` prefix or commit it.
For production, configure Clerk production keys, HTTPS, allowed redirect URLs,
and `authorizedParties` for your exact trusted application origins. Ensure your
CDN respects private/no-store responses.

```sh
npm run astro -- dev --background
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
npm run build
```

On PowerShell systems that block npm.ps1, use `npm.cmd` instead of `npm`.

## Browser verification

1. Signed out: `/` and `/pricing` load; dashboard redirects to login.
2. Signed out: `/API/me` returns 401 JSON with no private data.
3. Set `sessionStorage.isLoggedIn = "true"`; private access must still fail.
4. Sign in with Clerk: dashboard shows your ID and `/API/me` returns that ID.
5. Sign out using the button: reload dashboard and API; access must fail again.
6. With two accounts, verify each API response contains only the current user's ID.

Build checks do not verify real Clerk sign-in, session expiry, or deployment caches;
perform these browser checks using your configured Clerk instance.

References:
- https://clerk.com/docs/reference/astro/clerk-middleware
- https://docs.astro.build/en/guides/routing/

## Dodo Payments checkout

The public `/pricing` page has Free and Pro cards. Signed-out visitors can open
Clerk sign-in directly from the Pro card and return to pricing. Signed-in users
submit a same-origin POST to `/API/checkout`, which creates a hosted Dodo Checkout
Session using the server-configured product. The API never accepts a product ID,
price, user ID, or return URL from the browser. Your Dodo product determines
whether the purchase is one-time or recurring, and its price. When configured,
the page fetches and displays the base product price; checkout shows the final
price, taxes, localization and discounts.

### Setup

Keep your existing Clerk entries in `.env` and add the Dodo entries shown in
`.env.example` (do not overwrite your existing keys):

```dotenv
APP_URL=http://localhost:4321
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_API_KEY=your_test_api_key
DODO_PRO_PRODUCT_ID=your_test_product_id
```

1. In the Dodo Payments test dashboard, create a fixed-price Pro product. For a
   SaaS subscription, create a recurring product and configure its price and
   billing interval there. The example does not create products in your account.
2. Give the key Products Read, Checkout Sessions Read/Write, and Payments Read
   permissions. A restricted key without these permissions returns HTTP 403
   `INSUFFICIENT_PERMISSION`, even when the key and product ID are filled in.
   Set the test API key and product ID in your local `.env`. Never prefix these
   server settings with `PUBLIC_`. Restart the dev server after changing them.
3. Set `APP_URL` to the exact origin you use in the browser, including the port.
   `localhost` and `127.0.0.1` are different origins. In production use your HTTPS
   origin, `live_mode`, and a matching live API key and live product.
4. Open `/pricing`, sign in, and click Continue to checkout. Complete a test
   payment using Dodo's documented test payment methods.
5. Verify `/billing/return` displays the provider-confirmed result. Test cancel,
   failed payment, signed-out checkout, and another Clerk account as well.

### Confirmation and paid access

The return page uses an HttpOnly checkout-session cookie to locate the latest
checkout in this browser. It retrieves the actual payment from Dodo and checks
its metadata against the verified Clerk user before showing success. Browser
query parameters such as `status=succeeded` are not trusted. If the cookie is
missing, expired, overwritten by another checkout, or the provider is unreachable,
the page shows that it cannot confirm the payment rather than inventing success.

This integration handles hosted checkout and payment confirmation. It does not
yet grant Pro features or maintain subscription entitlements. There is no billing
database in this project. Before gating paid features, add a durable billing store
and a signature-verified, idempotent Dodo webhook handler for payments,
subscriptions, renewals, cancellations, refunds, and failures. Use server-written
`clerk_user_id` metadata to associate billing records with accounts. Do not grant
access merely because someone reaches the return URL. Add persisted checkout
idempotency and rate limits before accepting live payments, and prevent duplicate
subscriptions using your stored subscription state.

### Checks

```sh
npm run test:billing
npm run build
```

The billing tests mock provider calls. They check authentication, request origin,
server-selected products and account metadata, safe redirects, generic provider
errors, private response headers, and payment ownership verification. They do not
charge a card or replace testing with a real Dodo test account.

Official SDK reference: https://github.com/dodopayments/dodopayments-typescript

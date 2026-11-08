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

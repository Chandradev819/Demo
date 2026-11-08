import type { APIContext } from "astro";

type CheckoutConfig = { origin: string; productId: string; environment: string };
type CreateSession = (body: {
    product_cart: { product_id: string; quantity: number }[];
    metadata: Record<string, string>;
    return_url: string;
    cancel_url: string;
}) => PromiseLike<{ session_id: string; checkout_url?: string | null }>;

// Inject the provider call so security checks can be tested without payments.
export async function checkout(
    context: Pick<APIContext, "request" | "locals" | "cookies">,
    config: CheckoutConfig | null,
    createSession: CreateSession,
) {
    const headers = { "Cache-Control": "private, no-store" };
    const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
    const { isAuthenticated, userId } = context.locals.auth();
    if (!isAuthenticated || !userId) return fail("Please sign in before checking out.", 401);
    if (!config) return fail("Checkout is not available yet. Please try again later.", 503);
    // This cookie-authenticated POST must originate from our configured app.
    if (context.request.headers.get("Origin") !== config.origin) return fail("Invalid request origin.", 403);
    if (!context.request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded")) {
        return fail("Expected a checkout form.", 415);
    }
    const form = await context.request.formData().catch(() => null);
    if (form?.get("plan") !== "pro") return fail("Invalid plan.", 400);

    try {
        const session = await createSession({
            product_cart: [{ product_id: config.productId, quantity: 1 }],
            metadata: { clerk_user_id: userId, plan: "pro" },
            return_url: `${config.origin}/billing/return`,
            cancel_url: `${config.origin}/pricing?checkout=cancelled`,
        });
        if (!session.checkout_url) return fail("Unable to open checkout. Please try again.", 502);
        const destination = new URL(session.checkout_url);
        if (destination.protocol !== "https:" || !destination.hostname.endsWith(".dodopayments.com")) {
            return fail("Unable to open checkout. Please try again.", 502);
        }
        context.cookies.set("dodo_checkout", session.session_id, {
            httpOnly: true,
            secure: config.origin.startsWith("https:"),
            sameSite: "lax",
            path: "/billing",
            maxAge: 60 * 60,
        });
        if (context.request.headers.get("Accept")?.includes("application/json")) {
            return Response.json({ checkoutUrl: destination.href }, { headers });
        }
        return new Response(null, { status: 303, headers: { ...headers, Location: destination.href } });
    } catch {
        // Do not expose provider errors, payment data, or API credentials.
        return fail("Unable to open checkout. Please try again shortly.", 502);
    }
}

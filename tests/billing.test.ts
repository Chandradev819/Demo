import { test } from "node:test";
import assert from "node:assert/strict";
import { checkout } from "../src/lib/checkout.ts";
import { verifiedPaymentStatus } from "../src/lib/payment-status.ts";

const config = { origin: "https://app.example.com", productId: "pdt_server", environment: "test_mode" };

function context(options: { signedIn?: boolean; origin?: string; body?: string; accept?: string } = {}) {
    const cookies: unknown[][] = [];
    return {
        request: new Request(`${config.origin}/API/checkout`, {
            method: "POST",
            headers: { Origin: options.origin ?? config.origin, "Content-Type": "application/x-www-form-urlencoded", Accept: options.accept ?? "application/json" },
            body: options.body ?? "plan=pro",
        }),
        locals: { auth: () => ({ isAuthenticated: options.signedIn ?? true, userId: "user_verified" }) },
        cookies: { set: (...args: unknown[]) => cookies.push(args) },
        cookieCalls: cookies,
    };
}

test("signed-out and cross-origin requests never create a checkout", async () => {
    let calls = 0;
    const provider = async () => { calls++; throw new Error("must not run"); };
    assert.equal((await checkout(context({ signedIn: false }) as any, config, provider)).status, 401);
    assert.equal((await checkout(context({ origin: "https://evil.example" }) as any, config, provider)).status, 403);
    assert.equal((await checkout(context({ body: "plan=other" }) as any, config, provider)).status, 400);
    assert.equal((await checkout(context() as any, null, provider)).status, 503);
    assert.equal(calls, 0);
});

test("server controls the product and account metadata, and sets an HttpOnly cookie", async () => {
    const ctx = context({ body: "plan=pro&product_id=pdt_attacker&userId=other&amount=1" });
    let received: any;
    const response = await checkout(ctx as any, config, async (body) => {
        received = body;
        return { session_id: "cks_test", checkout_url: "https://checkout.dodopayments.com/session/test" };
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received.product_cart, [{ product_id: config.productId, quantity: 1 }]);
    assert.deepEqual(received.metadata, { clerk_user_id: "user_verified", plan: "pro" });
    assert.equal(received.return_url, `${config.origin}/billing/return`);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal((ctx.cookieCalls[0][2] as any).httpOnly, true);
    assert.equal((ctx.cookieCalls[0][2] as any).secure, true);
});

test("native form redirects, provider failures stay generic, unsafe checkout URLs are rejected", async () => {
    const response = await checkout(context({ accept: "text/html" }) as any, config, async () => ({ session_id: "cks_test", checkout_url: "https://test.checkout.dodopayments.com/session/test" }));
    assert.equal(response.status, 303);
    const failed = await checkout(context() as any, config, async () => { throw new Error("secret-provider-detail"); });
    assert.equal(failed.status, 502);
    assert.equal((await failed.text()).includes("secret-provider-detail"), false);
    const unsafe = await checkout(context() as any, config, async () => ({ session_id: "cks_test", checkout_url: "https://evil.example/pay" }));
    assert.equal(unsafe.status, 502);
});

test("confirmation requires provider success and matching Clerk ownership", async () => {
    const session = async () => ({ payment_id: "pay_test" });
    const ownPayment = async () => ({ metadata: { clerk_user_id: "user_verified", plan: "pro" }, status: "succeeded" });
    assert.equal(await verifiedPaymentStatus("cks_test", "user_verified", session, ownPayment), "succeeded");
    assert.equal(await verifiedPaymentStatus("cks_test", "other_user", session, ownPayment), "unavailable");
    assert.equal(await verifiedPaymentStatus("cks_test", "user_verified", async () => ({}), ownPayment), "pending");
    assert.equal(await verifiedPaymentStatus("cks_test", "user_verified", session, async () => ({ ...(await ownPayment()), status: "failed" })), "failed");
});

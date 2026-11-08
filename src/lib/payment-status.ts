type Payment = { metadata: Record<string, string>; status?: string | null };

export async function verifiedPaymentStatus(
    sessionId: string,
    userId: string,
    retrieveSession: (id: string) => PromiseLike<{ payment_id?: string | null }>,
    retrievePayment: (id: string) => PromiseLike<Payment>,
): Promise<"succeeded" | "pending" | "failed" | "unavailable"> {
    const session = await retrieveSession(sessionId);
    if (!session.payment_id) return "pending";
    const payment = await retrievePayment(session.payment_id);
    // A cookie/session ID is only a locator, never proof of ownership or payment.
    if (payment.metadata.clerk_user_id !== userId || payment.metadata.plan !== "pro") return "unavailable";
    if (payment.status === "succeeded") return "succeeded";
    if (payment.status === "failed" || payment.status === "cancelled") return "failed";
    return "pending";
}

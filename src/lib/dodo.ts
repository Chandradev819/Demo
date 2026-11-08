import DodoPayments from "dodopayments";

export function getBillingConfig(): {
    key: string;
    productId: string;
    origin: string;
    environment: "test_mode" | "live_mode";
} | null {
    const key = process.env.DODO_PAYMENTS_API_KEY || import.meta.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRO_PRODUCT_ID || import.meta.env.DODO_PRO_PRODUCT_ID;
    const originValue = process.env.APP_URL || import.meta.env.APP_URL;
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT || import.meta.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode";
    if (!key || !productId || !originValue) return null;
    if (environment !== "test_mode" && environment !== "live_mode") return null;
    try {
        const appUrl = new URL(originValue);
        if (appUrl.username || appUrl.password || appUrl.pathname !== "/" || appUrl.search || appUrl.hash) return null;
        const local = ["localhost", "127.0.0.1"].includes(appUrl.hostname);
        if (appUrl.protocol !== "https:" && !(local && appUrl.protocol === "http:" && environment === "test_mode")) return null;
        return { key, productId, origin: appUrl.origin, environment };
    } catch {
        return null;
    }
}

export async function getProPrice(): Promise<string | null> {
    const config = getBillingConfig();
    if (!config) return null;
    try {
        const product = await getDodoClient(config).products.retrieve(config.productId, {}, { timeout: 5_000 });
        const price = product.price;
        if (price.type !== "one_time_price" && price.type !== "recurring_price") return null;
        const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency });
        const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 2;
        // The checkout total remains authoritative for taxes, discounts and localization.
        const amount = formatter.format(price.price / 10 ** decimals);
        if (price.type === "one_time_price") return `${amount} one time`;
        const count = price.payment_frequency_count;
        return `${amount} / ${count === 1 ? "" : `${count} `}${price.payment_frequency_interval}${count === 1 ? "" : "s"}`;
    } catch (error) {
        // Log only a status, never the provider response body or credentials.
        console.error("[billing] Dodo product lookup failed", {
            status: error instanceof DodoPayments.APIError ? error.status : undefined,
        });
        return null;
    }
}

export function getDodoClient(config: NonNullable<ReturnType<typeof getBillingConfig>>) {
    return new DodoPayments({
        bearerToken: config.key,
        environment: config.environment,
        timeout: 15_000,
        maxRetries: 0,
    });
}

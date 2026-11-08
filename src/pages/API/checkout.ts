import type { APIRoute } from "astro";
import { checkout } from "../../lib/checkout";
import { getBillingConfig, getDodoClient } from "../../lib/dodo";

export const prerender = false;

export const POST: APIRoute = (context) => {
    const config = getBillingConfig();
    return checkout(context, config, (body) => getDodoClient(config!).checkoutSessions.create(body));
};

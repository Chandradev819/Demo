import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ locals }) => {
    const headers = { "Cache-Control": "private, no-store" };
    // The API must enforce auth even when the calling page is protected.
    const { isAuthenticated, userId } = locals.auth();
    if (!isAuthenticated || !userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }

    // For database queries, use this verified userId as the owner filter.
    // Never use a userId from query parameters or request bodies as authority.
    return Response.json({ userId }, { headers });
};

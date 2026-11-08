import { clerkMiddleware } from "@clerk/astro/server";

// Initializes verified auth state. Each private page/API checks locals.auth()
// before accessing data; middleware alone does not protect routes in Clerk v4.
export const onRequest = clerkMiddleware();

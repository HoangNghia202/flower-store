import { NextResponse } from "next/server";
import { auth } from "./auth";
import { productSlugExists } from "@/src/entites/product/actions/product-slug-exists";

const CATALOG_SLUG = /^\/catalog\/([^/]+)$/;

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Product not found | Bloom</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;color:#111}
main{text-align:center;padding:2rem}
h1{font-size:1.75rem;margin:0 0 .5rem}
p{color:#666;margin:0 0 1.5rem}
a{color:#ec4899;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<main>
<h1>Product not found</h1>
<p>We couldn&rsquo;t find the arrangement you were looking for.</p>
<a href="/catalog">Back to the catalog</a>
</main>
</body>
</html>`;

export async function proxy(request: Request) {
    const session = await auth();
    const url = new URL(request.url);

    // Secure admin dashboard
    if (url.pathname.startsWith("/admin")) {
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    if (
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/register")
    ) {
        if (session) {
            if (session.user.role == "ADMIN") {
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return NextResponse.redirect(new URL("/catalog", request.url));
        }
    }

    // Resolve unknown product slugs to a real 404 before the route renders.
    // The store-front layout streams its response (client boundaries), so a
    // `notFound()` thrown during render can only produce a soft-404 (200 +
    // noindex). Checking here lets the server set the HTTP status code.
    // Skipped for router prefetches to keep catalog browsing cheap — direct
    // hits and crawlers (which don't send that header) still get a 404.
    const catalogSlug =
        request.method === "GET" &&
        request.headers.get("next-router-prefetch") === null &&
        CATALOG_SLUG.exec(url.pathname);
    if (catalogSlug) {
        const slug = decodeURIComponent(catalogSlug[1]);
        if (!(await productSlugExists(slug))) {
            return new NextResponse(NOT_FOUND_HTML, {
                status: 404,
                headers: {
                    "content-type": "text/html; charset=utf-8",
                    "x-robots-tag": "noindex",
                },
            });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};

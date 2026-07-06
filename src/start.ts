import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Auth is entirely client-side (Firebase, on the `ssr: false` _authenticated
// route), so there is no function middleware attaching bearer tokens to
// serverFn RPCs anymore.
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));

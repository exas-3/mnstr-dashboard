/* Shared API-route helpers — one error contract for every JSON endpoint.
 *
 * apiHandler wraps a route's GET so an unexpected throw (DB down, bad SQL)
 * returns a uniform `{ error }` JSON 500 instead of Next's default error
 * body. The real error is logged server-side with the route path; clients
 * only ever see the generic message — never a stack or driver message.
 *
 * badRequest gives 400s the same `{ error }` shape so a validation reject
 * is distinguishable from an empty-but-successful result. */

import { NextResponse } from 'next/server';

export function apiHandler<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<Response> | Response,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      console.error(`[api] ${new URL(req.url).pathname}`, err);
      return NextResponse.json({ error: 'internal error' }, { status: 500 });
    }
  };
}

export function badRequest(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}

/* Path-param sanity checks. The DB happily takes garbage params and returns
 * empty rows (a 200 that looks like success) — reject junk up front. */

// EVM address — the only shape wallet routes accept.
export const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

// Card slug — kebab-case identifiers from the MnStr API; length-capped so
// an absurd path segment never reaches the LIKE/lookup path.
export const SLUG_RE = /^[a-z0-9-]{1,200}$/i;

/* Server-Sent Events push channel — replaces the 15-min HTTP poll on the
 * Pulse and Marketplace pages with real-time fan-out from the indexer.
 *
 * Architecture:
 *
 *   indexer (PID 7)   ──NOTIFY──▶   Postgres   ──LISTEN──▶   Next (PID 6)
 *                                                                │
 *                                                       hub EventEmitter
 *                                                                │
 *                                                       ┌────────┼────────┐
 *                                                       ▼        ▼        ▼
 *                                                    SSE #1   SSE #2   SSE #N
 *
 * One LISTEN connection per channel per process, shared across all SSE
 * responses via an in-memory EventEmitter. Clients see `event: pulls` or
 * `event: market` and refetch their own slice of data — we don't ship row
 * payloads through SSE, the existing JSON endpoints already do that well.
 */

import { EventEmitter } from 'node:events';
import { sql } from '@/db/client';

export const dynamic = 'force-dynamic';
// Node runtime — we need EventEmitter + a long-lived LISTEN connection.
export const runtime = 'nodejs';

const HEARTBEAT_MS = 25_000;

interface Hub {
  emitter: EventEmitter;
  ready: Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __mnstr_live_hub: Hub | undefined;
}

// Lazy singleton — first SSE request opens the LISTEN connection; subsequent
// requests reuse it. Global var survives Next.js dev hot-reloads so we don't
// leak LISTEN sockets when route files re-evaluate.
function getHub(): Hub {
  if (globalThis.__mnstr_live_hub) return globalThis.__mnstr_live_hub;
  const emitter = new EventEmitter();
  // EventEmitter defaults to a 10-listener warning; each SSE client adds 2
  // (pulls + market), so bump generously.
  emitter.setMaxListeners(1000);
  const ready = Promise.all([
    sql.listen('pulls_tick',  () => emitter.emit('pulls')),
    sql.listen('market_tick', () => emitter.emit('market')),
  ]).then(() => undefined);
  const hub: Hub = { emitter, ready };
  // If the LISTEN handshake fails (e.g. DB briefly unreachable on the first
  // request), evict the cached hub so the next request retries instead of
  // forever awaiting a rejected promise. Also keeps this from surfacing as an
  // unhandled rejection.
  ready.catch(() => {
    if (globalThis.__mnstr_live_hub === hub) globalThis.__mnstr_live_hub = undefined;
  });
  globalThis.__mnstr_live_hub = hub;
  return hub;
}

export async function GET() {
  const hub = getHub();
  await hub.ready;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (event: string, data = '') => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          // controller closed — client gone, ignore.
        }
      };

      // Initial hello so the client knows the stream is open. Useful as a
      // first byte for proxies that wait on the first chunk before
      // committing the response.
      send('hello');

      const onPulls  = () => send('pulls');
      const onMarket = () => send('market');
      hub.emitter.on('pulls',  onPulls);
      hub.emitter.on('market', onMarket);

      const heartbeat = setInterval(() => send('ping'), HEARTBEAT_MS);

      // Stash teardown on the controller so cancel() can find it. Next.js
      // calls cancel() when the client disconnects.
      (controller as unknown as { __teardown: () => void }).__teardown = () => {
        closed = true;
        clearInterval(heartbeat);
        hub.emitter.off('pulls',  onPulls);
        hub.emitter.off('market', onMarket);
      };
    },
    cancel(reason) {
      const teardown = (this as unknown as { __teardown?: () => void }).__teardown;
      teardown?.();
      void reason;
    },
  });

  return new Response(stream, {
    headers: {
      'content-type':  'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection':    'keep-alive',
      // Disable proxy buffering (nginx + some CDN edge nodes look at this).
      'x-accel-buffering': 'no',
    },
  });
}

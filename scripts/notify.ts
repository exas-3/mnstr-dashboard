/* Telegram alert sender for indexer failures (same pattern as the other
 * dashboards on this box: offshore / mica share one bot + chat, alerts are
 * distinguished by the prefix).
 *
 * Deliberately inert without configuration: when TELEGRAM_BOT_TOKEN /
 * TELEGRAM_CHAT_ID are unset (dev boxes), notify() resolves without doing
 * anything — callers can fire-and-forget on every failure path. It never
 * throws: an alerting outage must not take down the poller. */

export async function notify(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `[mnstr.watch] ${text}`,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[notify] telegram ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[notify] telegram send failed:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/* PM2 process definitions for the Hetzner box (/opt/mnstr-dashboard).
 *
 * Previously the runtime topology lived only in PM2's saved state on the box;
 * this file makes it reproducible. Apply with:
 *   pm2 start deploy/ecosystem.config.cjs   (first time)
 *   pm2 reload mnstr-dashboard              (deploys)
 *   pm2 restart mnstr-poller                (indexer/script changes)
 * then `pm2 save`.
 *
 * NOTE the `-H 127.0.0.1` bind: nginx terminates TLS and proxies via
 * localhost; the app must not be reachable directly on the public interface
 * (it was — http://<ip>:3010 answered from the internet). Pair with a ufw
 * deny on 3010 when applying.
 */

module.exports = {
  apps: [
    {
      name: 'mnstr-dashboard',
      cwd: '/opt/mnstr-dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3010 -H 127.0.0.1',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
    },
    {
      name: 'mnstr-poller',
      cwd: '/opt/mnstr-dashboard',
      script: 'node_modules/.bin/tsx',
      args: 'scripts/index.ts poll',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
    },
  ],
};

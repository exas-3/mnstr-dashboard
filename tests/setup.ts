/* scripts/config.ts fails fast on missing env vars at import time (good for
 * the indexer, wrong for unit tests) — stub the required ones so the pure
 * functions under test can be imported on a fresh clone with no .env. Never
 * point these at real endpoints: unit tests must not do network or DB I/O. */

process.env.ALCHEMY_RPC ??= 'https://unit-test.invalid/rpc';
process.env.DATABASE_URL ??= 'postgres://unit:test@127.0.0.1:1/unit_test_never_connects';
process.env.ETHERSCAN_KEY ??= 'unit-test-key';

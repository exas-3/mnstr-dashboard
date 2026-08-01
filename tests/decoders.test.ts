import { describe, expect, it } from 'vitest';
import {
  decode,
  decodeSellback,
  decodeCardBought,
  decodeCardPriceUpdated,
  topicToAddress,
  type RawLog,
} from '../scripts/chain.js';

/* Hand-rolled ABI decoding — an off-by-one in the hex slicing silently
 * corrupts every marketplace serial/price, so pin the byte layout with
 * synthetic fixtures built to the ABI spec (head slots, dynamic-string
 * offset/length/data). */

const WALLET = '0x3c93a6fa880d6437255b924de37f532d823039e1';
const BUYER  = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

function pad32(hex: string): string {
  return hex.replace(/^0x/, '').padStart(64, '0');
}
function addrTopic(addr: string): string {
  return '0x' + pad32(addr);
}
function uintHex(v: bigint | number): string {
  return pad32(BigInt(v).toString(16));
}
function abiString(s: string): { lenSlot: string; dataSlots: string } {
  const bytes = Buffer.from(s, 'utf8');
  const padded = bytes.toString('hex').padEnd(Math.ceil(bytes.length / 32) * 64, '0');
  return { lenSlot: uintHex(bytes.length), dataSlots: padded };
}

const BASE = {
  address: '0x5db1075782527e5ddacfdd816ea0c59b8c6eaad3',
  blockNumber: '0x10bd3f5',        // 17552373
  timeStamp: '0x68b1c2a0',         // 1756480160
  logIndex: '0x2',
  transactionHash: '0xdeadbeef',
  transactionIndex: '0x1',
};

describe('decode (PlayAssigned)', () => {
  it('decodes wallet, requestId and USDm amount', () => {
    const log: RawLog = {
      ...BASE,
      topics: ['0xtopic0', addrTopic(WALLET), '0x' + uintHex(123456n)],
      data: '0x' + uintHex(50_000000000000000000n), // 50 USDm in wei
    };
    const d = decode(log);
    expect(d.wallet).toBe(WALLET);
    expect(d.requestId).toBe(123456n);
    expect(d.amount).toBe(50_000000000000000000n);
    expect(d.blockNumber).toBe(17552373);
    expect(d.timestamp).toBe(1756480160);
    expect(d.logIndex).toBe(2);
  });

  it('treats empty data as a credit-paid pull (amount 0)', () => {
    const log: RawLog = {
      ...BASE,
      topics: ['0xtopic0', addrTopic(WALLET), '0x' + uintHex(7n)],
      data: '0x',
    };
    expect(decode(log).amount).toBe(0n);
  });
});

describe('decodeSellback (NFTSoldBack)', () => {
  it('decodes player and requestId from topics', () => {
    const log: RawLog = {
      ...BASE,
      topics: ['0xtopic0', addrTopic(WALLET), '0x' + uintHex(99n)],
      data: '0x',
    };
    const d = decodeSellback(log);
    expect(d.player).toBe(WALLET);
    expect(d.requestId).toBe(99n);
  });
});

describe('decodeCardBought — CardBought(string serial, address indexed buyer, uint256 priceWei)', () => {
  function fixture(serial: string, priceWei: bigint): RawLog {
    const s = abiString(serial);
    // head: [0]=offset to string (0x40 — two head slots), [1]=priceWei;
    // tail: [2]=string length, [3+]=string bytes.
    const data = '0x' + uintHex(0x40) + uintHex(priceWei) + s.lenSlot + s.dataSlots;
    return { ...BASE, topics: ['0xtopic0', addrTopic(BUYER)], data };
  }

  it('decodes a short serial and price', () => {
    const d = decodeCardBought(fixture('PSA-12345678', 125_500000000000000000n));
    expect(d.serial).toBe('PSA-12345678');
    expect(d.priceWei).toBe(125_500000000000000000n);
    expect(d.buyer).toBe(BUYER);
  });

  it('decodes a serial longer than one 32-byte slot', () => {
    const long = 'BGS-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // 42 bytes → 2 slots
    const d = decodeCardBought(fixture(long, 1n));
    expect(d.serial).toBe(long);
  });

  it('decodes an exactly-32-byte serial (boundary)', () => {
    const s32 = 'A'.repeat(32);
    expect(decodeCardBought(fixture(s32, 1n)).serial).toBe(s32);
  });
});

describe('decodeCardPriceUpdated — CardPriceUpdated(string serial, uint256 old, uint256 new)', () => {
  it('decodes serial and both prices', () => {
    const s = abiString('CGC-555');
    // head: [0]=offset (0x60 — three head slots), [1]=old, [2]=new.
    const data =
      '0x' + uintHex(0x60) + uintHex(80_000000000000000000n) + uintHex(95_000000000000000000n)
      + s.lenSlot + s.dataSlots;
    const d = decodeCardPriceUpdated({ ...BASE, topics: ['0xtopic0'], data });
    expect(d.serial).toBe('CGC-555');
    expect(d.oldPriceWei).toBe(80_000000000000000000n);
    expect(d.newPriceWei).toBe(95_000000000000000000n);
  });
});

describe('topicToAddress', () => {
  it('lowercases and extracts the rightmost 20 bytes', () => {
    expect(topicToAddress(addrTopic('0xAbCdEfabcdefabcdefabcdefabcdefabcdefabcd'))).toBe(BUYER);
  });
});

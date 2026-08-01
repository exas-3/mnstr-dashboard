import Link from 'next/link';
import { Lbl, Mono } from '../primitives';
import { CATEGORIES } from './tier-categories';
import type { TierEconomics } from '@/lib/queries';
import { abbrUsdStr } from '@/lib/format';

export default function TierHeroRow({
  econs,
  active,
}: {
  econs: Record<string, TierEconomics>;
  active: string;
}) {
  return (
    <div className="hidden lg:block lg:px-3 lg:pt-3">
      {CATEGORIES.map((cat, ci) => (
        <section key={cat.key} className={ci === 0 ? '' : 'mt-5'}>
          <div className="flex items-baseline justify-between pb-2">
            <Mono
              style={{
                fontSize: 9.5,
                color: cat.color,
                letterSpacing: '0.22em',
                textShadow: `0 0 8px color-mix(in oklch, ${cat.color} 30%, transparent)`,
              }}
            >
              {cat.label}
            </Mono>
            <Mono style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
              {cat.tiers.length} {cat.tiers.length === 1 ? 'PACK' : 'PACKS'}
            </Mono>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {cat.tiers.map((t, ti) => {
              const e = econs[t.key];
              if (!e) return null;
              const on = t.key === active;
              const href = t.key === 'Premium' ? '/tiers' : `/tiers?tier=${t.key}`;
              // When a category only has one tier (Adventure), drop it into
              // column 3 so it sits beneath Ultra instead of beneath Starter.
              const colStart = cat.tiers.length === 1 && ti === 0 ? 'col-start-3' : '';
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={`block px-4 py-4 transition-colors ${colStart}`}
                  style={{
                    background: on ? 'var(--bg-3)' : 'var(--bg-2)',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                    boxShadow: on
                      ? '0 0 0 1px color-mix(in oklch, var(--accent) 30%, transparent), 0 0 22px color-mix(in oklch, var(--accent) 13%, transparent)'
                      : 'none',
                  }}
                >
                  <div className="flex items-baseline justify-between">
                    <Lbl style={{ fontSize: 9, color: on ? 'var(--accent)' : 'var(--fg-3)' }}>
                      {t.label}
                    </Lbl>
                    <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                      ${e.price.toLocaleString('en-US')}
                    </Mono>
                  </div>
                  <Mono
                    style={{
                      marginTop: 8,
                      display: 'block',
                      fontSize: 48,
                      color: e.edge <= 0 ? 'var(--positive)' : 'var(--tier-magenta)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {e.edge <= 0 ? '+' : '−'}{Math.abs(e.edge * 100).toFixed(1)}%
                  </Mono>
                  <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', display: 'block', marginTop: 4 }}>
                    PLAYER EV
                  </Mono>
                  <div className="mt-4 grid grid-cols-3 gap-2" style={{ borderTop: '1px dashed var(--line-soft)', paddingTop: 10 }}>
                    <Stat label="EV" value={abbrUsdStr(e.ev)} />
                    <Stat label="VOLUME" value={abbrUsdStr(e.price * e.pulls)} />
                    <Stat label="SOLD" value={`${(e.sellbackRate * 100).toFixed(0)}%`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>{label}</Mono>
      <Mono style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2, display: 'block' }}>{value}</Mono>
    </div>
  );
}

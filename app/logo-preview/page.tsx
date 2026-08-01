import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MnstrWatch } from '@/components/MnstrWatch';
import { Mono } from '@/components/primitives';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Logo preview',
  robots: { index: false, follow: false },
};

// Design tool, dev-only — 404s in production instead of shipping an internal
// page on the public site.
const DEV_ONLY = process.env.NODE_ENV === 'production';

const SIZES = [28, 36, 48, 64, 96, 128, 192];

export default function LogoPreview() {
  if (DEV_ONLY) notFound();
  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)', color: 'var(--fg)', padding: 32 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.22em', display: 'block' }}>
          LOGO PREVIEW · /logo-preview
        </Mono>
        <h1 style={{ fontFamily: 'var(--font-blackletter), serif', fontSize: 48, marginTop: 8, marginBottom: 6 }}>
          Mn$tr.watch
        </h1>
        <p style={{ color: 'var(--fg-3)', maxWidth: '70ch', lineHeight: 1.55, marginBottom: 24 }}>
          Live render of the <code>&lt;MnstrWatch&gt;</code> component at the sizes used across the app, plus
          a row of the raw assets from <code>/public/</code> for direct comparison. The designer&apos;s
          canonical reference (HTML lockup set with mascot slot) lives at{' '}
          <code>design/logo-reference.html</code> (local-only, rsync-excluded).
        </p>

        <Section title="Foil (full color) — used in Foil theme top bar / side rail">
          <Row>
            {SIZES.map(s => (
              <Cell key={s} label={`${s}px`}>
                <MnstrWatch size={s} mascotUrl="/mascot.svg" />
              </Cell>
            ))}
          </Row>
          <Row>
            {SIZES.map(s => (
              <Cell key={s} label={`${s}px · no mascot`}>
                <MnstrWatch size={s} />
              </Cell>
            ))}
          </Row>
        </Section>

        <Section title="Raw SVG assets from /public/ (no component wrapping)">
          <Row>
            {SIZES.map(s => (
              <Cell key={s} label={`watch ${s}px`}>
                <img
                  src="/mnstr-watch.svg"
                  alt=""
                  width={s}
                  height={Math.round((s * 280) / 240)}
                  style={{ display: 'block' }}
                />
              </Cell>
            ))}
          </Row>
          <Row>
            {SIZES.map(s => (
              <Cell key={s} label={`mascot ${s}px`}>
                <img
                  src="/mascot.svg"
                  alt=""
                  width={s}
                  height={s}
                  style={{
                    display: 'block',
                    objectFit: 'contain',
                    background: 'var(--bg-2)',
                  }}
                />
              </Cell>
            ))}
          </Row>
        </Section>

        <Section title="In-context: header lockups (the way they appear in the app)">
          <Row>
            <Cell label="Top bar · 24px">
              <Lockup size={24} mono={false} />
            </Cell>
            <Cell label="Side rail · 28px">
              <Lockup size={28} mono={false} />
            </Cell>
          </Row>
        </Section>

        <Section title="Favicons / OG (rasterised from sharp)">
          <Row>
            <Cell label="favicon-32 (32×32)">
              <img src="/favicon-32.png" width={64} height={64} style={{ imageRendering: 'pixelated', background: 'var(--bg-2)' }} />
            </Cell>
            <Cell label="favicon-192 (192×192)">
              <img src="/favicon-192.png" width={192} height={192} style={{ background: 'var(--bg-2)' }} />
            </Cell>
            <Cell label="apple-touch-icon (180×180)">
              <img src="/apple-touch-icon.png" width={180} height={180} style={{ background: 'var(--bg-2)' }} />
            </Cell>
          </Row>
          <Row>
            <Cell label="og-default (1200×630)">
              <img src="/og-default.png" width={600} height={315} style={{ background: 'var(--bg-2)' }} />
            </Cell>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.16em', display: 'block', marginBottom: 10 }}>
        {title}
      </Mono>
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line-soft)',
          padding: 20,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Row({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 18,
        alignItems: 'flex-end',
        marginBottom: 8,
        padding: dark ? 18 : 0,
        background: dark ? 'oklch(0.05 0.005 70)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function Cell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ minHeight: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {children}
      </div>
      <Mono
        style={{
          fontSize: 9,
          color: 'var(--fg-4)',
          letterSpacing: '0.1em',
          marginTop: 6,
          display: 'block',
        }}
      >
        {label}
      </Mono>
    </div>
  );
}

function Lockup({ size, mono }: { size: number; mono: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: mono ? 'oklch(0.05 0.005 70)' : 'var(--bg)',
        border: '1px solid var(--line-soft)',
      }}
    >
      <MnstrWatch
        size={size}
        mascotUrl={mono ? undefined : '/mascot.svg'}
        mono={mono}
        color={mono ? 'oklch(0.78 0.18 142)' : undefined}
      />
      <span
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-blackletter), UnifrakturCook, serif',
          fontWeight: mono ? 400 : 700,
          fontSize: mono ? 14 : 22,
          color: mono ? 'oklch(0.78 0.18 142)' : 'var(--fg)',
          letterSpacing: mono ? '0.04em' : 0,
          textShadow: mono ? '0 0 6px color-mix(in oklch, oklch(0.78 0.18 142) 53%, transparent)' : 'none',
        }}
      >
        {mono ? 'MN$TR' : 'Mn$tr'}
      </span>
    </span>
  );
}

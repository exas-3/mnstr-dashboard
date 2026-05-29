import type { Metadata } from 'next';
import { Lbl, Mono, SectionHead } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the MnStr Watch analytics dashboard.',
  alternates: { canonical: '/privacy' },
};

export const revalidate = 86_400;

export default function PrivacyPage() {
  return (
    <div className="pb-12">
      <div className="px-4 pt-3 pb-1">
        <Lbl>LEGAL · PRIVACY</Lbl>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 24,
            color: 'var(--fg)',
            marginTop: 6,
            letterSpacing: '-0.01em',
          }}
        >
          Privacy Policy
        </h1>
        <Mono style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4, display: 'block' }}>
          Effective 2026-05-27 · last updated 2026-05-27
        </Mono>
      </div>

      <SectionHead tag="01 · SUMMARY" title="The short version" />
      <Body>
        <p>
          MnStr Watch is a read-only public dashboard. We do not require accounts, do not collect
          personal information, do not sell data, and do not place tracking cookies. The page-view
          counter is privacy-friendly (no individual fingerprinting). Every wallet address shown on
          the site is already public on the MegaETH blockchain.
        </p>
      </Body>

      <SectionHead tag="02 · WHAT WE COLLECT" title="Minimum necessary" />
      <Body>
        <p>
          <strong style={{ color: 'var(--fg)' }}>Server logs.</strong> The web server records
          request URLs, response codes, response times, and the requesting IP address for the
          purpose of operating the service, debugging, and rate-limiting. Logs are rotated and
          discarded over time; we do not link them to any other identifier and we do not sell or
          share them.
        </p>
        <p>
          <strong style={{ color: 'var(--fg)' }}>Page-view analytics.</strong> We use Plausible
          Analytics to count visits per page. Plausible does not use cookies, does not set
          persistent identifiers, and does not collect personal data. Aggregated metrics
          (page-view counts, referrer hostnames, country at country level) are stored on a
          self-hosted Plausible instance we control.
        </p>
        <p>
          <strong style={{ color: 'var(--fg)' }}>UI preferences.</strong> Your local browser may
          store small layout preferences (e.g. sidebar collapsed) in <code>localStorage</code> on
          your device. This never leaves your browser; we cannot read it.
        </p>
      </Body>

      <SectionHead tag="03 · WHAT WE DON'T DO" title="No accounts, no tracking" />
      <Body>
        <p>
          We do not require sign-up. We do not place advertising cookies or third-party tracking
          pixels. We do not run third-party analytics other than the privacy-friendly Plausible
          counter described above. We do not sell, rent, or share data with brokers.
        </p>
      </Body>

      <SectionHead tag="04 · PUBLIC DATA WE DISPLAY" title="Why your wallet appears here" />
      <Body>
        <p>
          Every wallet, transaction hash, card serial, and timestamp on this site is sourced from
          the public MegaETH blockchain or from the public mnstr.xyz REST API. Wallet ↔ username
          mappings come from MnStr&apos;s user profiles, which players make public by their own
          choice on mnstr.xyz. We do not de-anonymize anyone; we display what is already public.
        </p>
        <p>
          If you would prefer that we exclude a wallet or username from the leaderboards, you can
          ask, but be aware that the underlying chain data remains accessible to anyone with an
          internet connection and a block explorer.
        </p>
      </Body>

      <SectionHead tag="05 · THIRD PARTIES" title="What loads alongside the page" />
      <Body>
        <p>
          The page may fetch card images from <code>cdn.mnstr.xyz</code> (proxied through our own
          server with disk caching, so your browser only ever contacts us directly). The font files
          come from the same origin. The hosting provider is Hetzner; the RPC providers we use to
          index the chain are Alchemy and the official MegaETH RPC.
        </p>
      </Body>

      <SectionHead tag="06 · COOKIES" title="What lives on your device" />
      <Body>
        <p>
          We do not set any cookies. The only persisted state on your device is small UI layout
          preferences in <code>localStorage</code>, which stay in your browser and are never
          transmitted.
        </p>
      </Body>

      <SectionHead tag="07 · CHILDREN" title="Not directed at children" />
      <Body>
        <p>
          MnStr Watch is not directed at children under 13. We do not knowingly collect data from
          children.
        </p>
      </Body>

      <SectionHead tag="08 · CHANGES" title="Updates to this policy" />
      <Body>
        <p>
          We may revise this policy as the site evolves. The &ldquo;last updated&rdquo; date above
          reflects the most recent revision.
        </p>
      </Body>

      <SectionHead tag="09 · CONTACT" title="Questions or requests" />
      <Body>
        <p>
          Reach out on X:{' '}
          <a
            href="https://x.com/0xExas"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent)' }}
          >
            @0xExas
          </a>
          .
        </p>
      </Body>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-3 px-3.5 py-3.5"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--line-soft)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--fg-2)',
        lineHeight: 1.65,
      }}
    >
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

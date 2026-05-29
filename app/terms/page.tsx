import type { Metadata } from 'next';
import { Lbl, Mono, SectionHead } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for the MnStr Watch analytics dashboard.',
  alternates: { canonical: '/terms' },
};

export const revalidate = 86_400; // 1 day; this content rarely changes.

export default function TermsPage() {
  return (
    <div className="pb-12">
      <div className="px-4 pt-3 pb-1">
        <Lbl>LEGAL · TERMS</Lbl>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 24,
            color: 'var(--fg)',
            marginTop: 6,
            letterSpacing: '-0.01em',
          }}
        >
          Terms of Service
        </h1>
        <Mono style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4, display: 'block' }}>
          Effective 2026-05-27 · last updated 2026-05-27
        </Mono>
      </div>

      <SectionHead tag="01 · OVERVIEW" title="What this is" />
      <Body>
        <p>
          MnStr Watch (this site) is an independent, read-only analytics dashboard for the MnStr
          gacha protocol deployed on MegaETH. It aggregates publicly available on-chain data and
          public API responses from mnstr.xyz, presents them in convenient form, and provides
          tooling for exploring pulls, wallets, cards, and marketplace activity.
        </p>
        <p>
          MnStr Watch is <strong style={{ color: 'var(--fg)' }}>not affiliated with</strong> MnStr,
          the MnStr team, or any related entity. We do not custody assets, accept funds, execute
          trades, or transmit user-controlled information of any kind.
        </p>
      </Body>

      <SectionHead tag="02 · ACCEPTANCE" title="By using the site, you agree" />
      <Body>
        <p>
          Accessing or using MnStr Watch constitutes your agreement to these Terms. If you do not
          agree, do not use the site. We may update these Terms at any time; continued use after
          changes are posted is acceptance of the revised Terms.
        </p>
      </Body>

      <SectionHead tag="03 · NO ADVICE" title="Informational only · not financial advice" />
      <Body>
        <p>
          All content on this site is informational and provided for general interest. Nothing here
          is investment advice, trading advice, tax advice, legal advice, or a recommendation to
          buy, sell, hold, or interact with any digital asset, NFT, gacha pack, or protocol.
        </p>
        <p>
          You are solely responsible for any decision you make. Past activity, displayed payouts,
          on-chain history, and statistical edges are not predictive of future outcomes.
        </p>
      </Body>

      <SectionHead tag="04 · NO WARRANTY" title='Service provided "as-is"' />
      <Body>
        <p>
          MnStr Watch is provided <strong style={{ color: 'var(--fg)' }}>without warranties of any kind</strong>,
          express or implied, including merchantability, fitness for a particular purpose, accuracy,
          completeness, availability, timeliness, or non-infringement.
        </p>
        <p>
          Displayed data may be incomplete, delayed, mis-classified, or simply wrong due to indexer
          lag, RPC failures, mnstr.xyz API changes, or our own bugs. We make no guarantee about
          uptime, data freshness, or correctness. Do not rely on this site as a system of record.
        </p>
      </Body>

      <SectionHead tag="05 · DATA SOURCES" title="Where the numbers come from" />
      <Body>
        <p>
          On-chain data is indexed from MegaETH via public RPC endpoints (Alchemy, official MegaETH
          RPC). Card metadata, FMV appraisals, and user handles are fetched from the public mnstr.xyz
          REST API. We do not have access to private mnstr.xyz systems and cannot confirm anything
          that does not appear in those two sources.
        </p>
      </Body>

      <SectionHead tag="06 · LIMITATION OF LIABILITY" title="At your own risk" />
      <Body>
        <p>
          To the maximum extent permitted by law, MnStr Watch, its operator, and contributors are
          not liable for any direct, indirect, incidental, special, consequential, or exemplary
          damages — including loss of profit, loss of data, or loss of opportunity — arising out of
          your use of, or inability to use, the site.
        </p>
      </Body>

      <SectionHead tag="07 · ACCEPTABLE USE" title="Be a good citizen" />
      <Body>
        <p>
          You agree not to (a) scrape the site at rates that materially affect availability for
          other users, (b) attempt to access non-public systems, or (c) use the site to facilitate
          activity that violates applicable law in your jurisdiction.
        </p>
      </Body>

      <SectionHead tag="08 · CHANGES" title="Updates to the site or these Terms" />
      <Body>
        <p>
          We may modify, suspend, or discontinue any feature at any time without notice. We may
          revise these Terms at any time; the &ldquo;last updated&rdquo; date above reflects the
          most recent revision.
        </p>
      </Body>

      <SectionHead tag="09 · CONTACT" title="Questions" />
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

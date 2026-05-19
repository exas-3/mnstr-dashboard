import { Mono } from './primitives';

export default function EmptyState({
  title = 'NO RESULTS',
  sub = 'Try a different query.',
}: {
  title?: string;
  sub?: string;
}) {
  return (
    <div
      className="mx-3 my-3 px-4 py-8 text-center"
      style={{ border: '1px dashed var(--line)', background: 'var(--bg-2)' }}
    >
      <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.2em', display: 'block' }}>
        {title}
      </Mono>
      <div
        className="mt-2"
        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)' }}
      >
        {sub}
      </div>
    </div>
  );
}

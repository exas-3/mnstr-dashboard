export default function RouteStub({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-fg-3 mono mt-2 text-xs uppercase tracking-widest">stub · awaiting prototype</p>
      <p className="text-fg-2 mt-6 max-w-prose text-sm leading-relaxed">{blurb}</p>
    </div>
  );
}

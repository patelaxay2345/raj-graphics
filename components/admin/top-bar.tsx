export function TopBar({ crumbs, children }: { crumbs: string[]; children?: React.ReactNode }) {
  const last = crumbs.at(-1);
  return (
    <header className="top">
      <nav aria-label="Breadcrumb">
        {crumbs.slice(0, -1).map((c) => <span key={c}>{c}<span className="sep" aria-hidden="true">/</span></span>)}
        <b>{last}</b>
      </nav>
      {children}
    </header>
  );
}

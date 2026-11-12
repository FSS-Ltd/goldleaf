type LoadingVariant = "dashboard" | "list" | "detail" | "messages" | "account" | "profile";

function Lines() {
  return <>
    <div className="portal-loading__bar portal-loading__card-title" />
    <div className="portal-loading__bar portal-loading__line" />
    <div className="portal-loading__bar portal-loading__line portal-loading__line--short" />
  </>;
}

function Rows({ count }: { count: number }) {
  return <div className="portal-loading__card portal-loading__rows">
    {Array.from({ length: count }, (_, item) => <div className="portal-loading__row" key={item}>
      <Lines />
    </div>)}
  </div>;
}

function LoadingCards({ variant }: { variant: LoadingVariant }) {
  if (variant === "list") return <>
    <Rows count={4} />
    <div className="portal-loading__card"><Lines /></div>
  </>;
  if (variant === "messages") return <>
    <Rows count={3} />
    <div className="portal-loading__card portal-loading__primary">
      <Lines />
      <div className="portal-loading__bar portal-loading__composer" />
    </div>
  </>;
  return <>
    <div className="portal-loading__card portal-loading__primary"><Lines /></div>
    <div className="portal-loading__card"><Lines /></div>
    <div className="portal-loading__card"><Lines /></div>
  </>;
}

export function PortalLoading({ label, variant = "dashboard", contentOnly = false }: {
  label: string;
  variant?: LoadingVariant;
  contentOnly?: boolean;
}) {
  const content = <>
    <span role="status" className="sr-only">{label}</span>
    <div aria-hidden="true" className={`portal-loading portal-loading--${variant}${contentOnly ? " portal-loading--content" : ""}`}>
      {!contentOnly && <>
        <div className="portal-loading__masthead">
          <div className="portal-loading__bar portal-loading__brand" />
        </div>
        <aside className="portal-loading__sidebar">
          <div className="portal-loading__bar portal-loading__brand" />
          {[0, 1, 2, 3].map((item) => <div key={item} className="portal-loading__bar portal-loading__nav" />)}
        </aside>
      </>}
      <div className="portal-loading__body">
        <div className="portal-loading__bar portal-loading__eyebrow" />
        <div className="portal-loading__bar portal-loading__title" />
        <div className="portal-loading__bar portal-loading__subtitle" />
        <div className="portal-loading__grid"><LoadingCards variant={variant} /></div>
      </div>
    </div>
  </>;
  return contentOnly ? content : <main id="main">{content}</main>;
}

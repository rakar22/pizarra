import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {kicker ? <p className="text-[13px] font-medium text-muted">{kicker}</p> : null}
      <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight">{title}</h1>
      {children ? (
        <div className="mt-1.5 max-w-lg text-[15px] leading-snug text-muted">{children}</div>
      ) : null}
    </header>
  );
}

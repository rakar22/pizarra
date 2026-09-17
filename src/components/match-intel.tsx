import { FormPills } from "@/components/form-pills";
import type { MatchIntel } from "@/lib/football/types";

export function MatchIntelPanel({ intel }: { intel: MatchIntel }) {
  const hasBody =
    intel.venue ||
    intel.h2h ||
    intel.lastFive.length ||
    intel.leaders.length ||
    intel.injuries.length ||
    intel.headlines.length;
  if (!hasBody) return null;

  return (
    <section className="mt-6">
      <h2 className="ios-section">Contexto</h2>
      <div className="ios-group px-4 py-4">
        <dl className="grid gap-3 text-[15px] md:grid-cols-2">
          {intel.venue && (
            <div>
              <dt className="text-[12px] font-medium text-faint">Estadio</dt>
              <dd className="mt-0.5">
                {intel.venue}
                {intel.city ? <span className="text-muted"> · {intel.city}</span> : null}
              </dd>
            </div>
          )}
          {intel.h2h && (
            <div>
              <dt className="text-[12px] font-medium text-faint">Cara a cara</dt>
              <dd className="mt-0.5">{intel.h2h}</dd>
            </div>
          )}
        </dl>

        {intel.lastFive.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {intel.lastFive.map((block) => (
              <div key={block.team}>
                <p className="text-[12px] font-medium text-faint">{block.team}</p>
                <div className="mt-1">
                  <FormPills form={block.items.map((i) => i.result).join("")} />
                </div>
                <ul className="mt-2 space-y-1 text-[13px] text-muted">
                  {block.items.map((i, idx) => (
                    <li key={`${i.opponent}-${idx}`}>
                      {i.result} {i.home ? "vs" : "@"} {i.opponent} {i.score}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {intel.leaders.length > 0 && (
          <ul className="mt-4 space-y-1 text-[15px]">
            {intel.leaders.map((l) => (
              <li key={l.team + l.line}>
                <span className="text-muted">{l.team}:</span> {l.line}
              </li>
            ))}
          </ul>
        )}

        {intel.injuries.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] font-medium text-faint">Bajas</p>
            <ul className="mt-1 space-y-1 text-[15px]">
              {intel.injuries.map((inj) => (
                <li key={inj.team + inj.player}>
                  {inj.player} <span className="text-muted">({inj.team})</span>
                  {inj.status ? <span className="text-faint"> · {inj.status}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {intel.headlines.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-[15px] text-muted">
            {intel.headlines.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

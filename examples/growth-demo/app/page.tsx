import { Button } from "@/components/ui/button";
import AgentView from "@/components/agent/agent-view";
import { content } from "@/config/content";

const MAX_QUERY_LEN = 160;

/** Renders the CTA heading with the `accent` words highlighted in brand teal. */
function renderCtaHeading() {
  const { heading, accent } = content.cta;
  const at = accent ? heading.indexOf(accent) : -1;
  if (at === -1) return heading;
  return (
    <>
      {heading.slice(0, at)}
      <span className="text-kinetk-teal">{accent}</span>
      {heading.slice(at + accent.length)}
    </>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const raw = Array.isArray(q) ? q[0] : q;
  const initialQuery = (raw ?? "").trim().slice(0, MAX_QUERY_LEN);

  return (
    <main className="w-full">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-kinetk px-4">
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.22em] text-kinetk-cyan">
            {content.eyebrow}
          </p>
          <AgentView initialQuery={initialQuery} />
        </div>
      </section>

      <section className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-kinetk space-y-8 px-4">
          <div className="flex items-center gap-6">
            <div className="h-px flex-1 bg-white/15" />
            <h2 className="font-bebasNeue text-3xl tracking-wide md:text-4xl">
              {content.explainer.heading}
            </h2>
            <div className="h-px flex-1 bg-white/15" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {content.explainer.cards.map((c) => (
              <div
                key={c.title}
                className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="text-lg font-semibold text-white">{c.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto flex max-w-kinetk flex-col items-center justify-between gap-6 px-4 lg:flex-row lg:gap-0">
          <h2 className="max-w-lg text-center font-bebasNeue text-3xl leading-tight tracking-wide text-white md:text-4xl lg:text-left">
            {renderCtaHeading()}
          </h2>
          <Button className="w-full xs:w-fit" asChild>
            <a href={content.cta.href} target="_blank" rel="noopener noreferrer">
              {content.cta.buttonLabel}
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}

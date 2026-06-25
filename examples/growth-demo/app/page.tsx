import { Button } from "@/components/ui/button";
import AgentView from "@/components/agent/agent-view";

const API_ACCESS_URL = "https://platform.kinetk.ai/login";

export default function Home() {
  return (
    <main className="w-full">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-kinetk px-4">
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.22em] text-kinetk-cyan">
            KINETK API + MCP · Live Demo
          </p>
          <AgentView />
        </div>
      </section>

      <section className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-kinetk space-y-8 px-4">
          <div className="flex items-center gap-6">
            <div className="h-px flex-1 bg-white/15" />
            <h2 className="font-bebasNeue text-3xl tracking-wide md:text-4xl">
              Why a chatbot can&apos;t do this
            </h2>
            <div className="h-px flex-1 bg-white/15" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Grounded demand, not guesses",
                body: "A bare LLM invents angles from stale priors. Every hook, channel and proof point here is built on what's actually resonating around the category now — with the signal shown right beside it.",
              },
              {
                title: "Context over MCP, strategy from Gemini",
                body: "The agent runs the KINETK MCP workflow — create job, poll, fetch the insights result — then Gemini turns that live signal into a launch & growth plan. You watch both halves happen.",
              },
              {
                title: "Where it converts",
                body: "Per-platform engagement premiums, amplifier scores and tag arbitrage rank the channels and hooks — so 'how do I launch this' becomes a defensible, prioritized plan.",
              },
            ].map((c) => (
              <div key={c.title} className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-lg font-semibold text-white">{c.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto flex max-w-kinetk flex-col items-center justify-between gap-6 px-4 lg:flex-row lg:gap-0">
          <h2 className="max-w-lg text-center font-bebasNeue text-3xl leading-tight tracking-wide text-white md:text-4xl lg:text-left">
            Give your agents the{" "}
            <span className="text-kinetk-teal">KINETK MCP</span>
          </h2>
          <Button className="w-full xs:w-fit" asChild>
            <a href={API_ACCESS_URL} target="_blank" rel="noopener noreferrer">
              Get your API key
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}

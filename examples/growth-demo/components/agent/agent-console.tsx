"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Brain,
  CheckCircle2,
  Play,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { AgentEvent, ToolName } from "@/lib/kinetk/types";
import { content } from "@/config/content";

const TOOL_META: Record<ToolName, { Icon: typeof Play; label: string }> = {
  create_context_job: { Icon: Play, label: "create_context_job" },
  get_context_job_status: { Icon: RefreshCw, label: "get_context_job_status" },
  get_context_job_result: { Icon: ArrowDownToLine, label: "get_context_job_result" },
};

export default function AgentConsole({
  events,
  running,
}: {
  events: AgentEvent[];
  running: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#05080a]">
      <style>{`@keyframes ac-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}} .ac-row{animation:ac-in .35s ease-out both}`}</style>
      <div className="bg-kinetk-stream flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        <span className="ml-1 text-xs font-medium text-white/55">
          {content.console.label}
        </span>
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-kinetk-cyan">
            <span className="size-1.5 animate-pulse rounded-full bg-kinetk-cyan" />
            running
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4 font-mono text-[13px]">
        {events.map((e, i) => (
          <ConsoleRow key={i} event={e} />
        ))}
        {running && (
          <p className="text-white/30">
            <span className="inline-block animate-pulse">▋</span>
          </p>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function ConsoleRow({ event }: { event: AgentEvent }) {
  if (event.type === "thought") {
    return (
      <div className="ac-row flex gap-2 text-white/70">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-kinetk-amber" />
        <p className="font-sans leading-snug">{event.text}</p>
      </div>
    );
  }

  if (event.type === "tool_call") {
    const meta = TOOL_META[event.tool];
    return (
      <div className="ac-row rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex items-center gap-2 text-kinetk-cyan">
          <meta.Icon className="size-3.5" />
          <span className="font-medium">{meta.label}</span>
        </div>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-white/45">
          {JSON.stringify(event.args)}
        </pre>
      </div>
    );
  }

  if (event.type === "tool_result") {
    const Icon = event.ok ? CheckCircle2 : XCircle;
    return (
      <div className={`ac-row flex items-center gap-2 ${event.ok ? "text-white/55" : "text-kinetk-amber"}`}>
        <Icon className={`size-3.5 shrink-0 ${event.ok ? "text-kinetk-teal" : ""}`} />
        <span className="truncate">{event.summary}</span>
      </div>
    );
  }

  if (event.type === "synthesize") {
    return (
      <div className="ac-row rounded-lg border border-kinetk-amber/30 bg-kinetk-amber/[0.06] px-3 py-2">
        <div className="flex items-center gap-2 text-kinetk-amber">
          <Brain className="size-3.5" />
          <span className="font-medium">synthesize · {event.model}</span>
        </div>
        <p className="mt-1 font-sans text-xs leading-snug text-white/50">
          Gemini is turning the live insight signal into a launch plan…
        </p>
      </div>
    );
  }

  if (event.type === "metric") {
    return (
      <div className="ac-row flex items-center gap-2 text-white/55">
        <span className="rounded bg-kinetk-teal/15 px-1.5 py-0.5 text-xs text-kinetk-teal">
          {event.value}
        </span>
        <span className="text-xs">{event.label}</span>
      </div>
    );
  }

  if (event.type === "error") {
    return (
      <div className="ac-row flex items-center gap-2 text-kinetk-amber">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>{event.message}</span>
      </div>
    );
  }

  return null;
}

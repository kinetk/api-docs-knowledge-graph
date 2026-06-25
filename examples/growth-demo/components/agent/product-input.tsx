"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  "a $400 sleep-tracking ring for anxious millennials",
  "a refillable matcha starter kit for Gen Z",
  "a weighted blanket for hot sleepers",
];

export default function ProductInput({
  onRun,
  running,
}: {
  onRun: (product: string) => void;
  running: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(v: string) {
    const t = v.trim();
    if (!t || running) return;
    onRun(t);
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex w-full flex-col gap-2 rounded-xl border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm focus-within:border-kinetk-cyan/60 sm:flex-row sm:items-center"
      >
        <Sparkles className="ml-2.5 hidden size-4 shrink-0 text-white/40 sm:block" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe your product in one sentence…"
          aria-label="Product"
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-white placeholder:text-white/35 focus:outline-none"
        />
        <Button type="submit" isLoading={running} disabled={!value.trim()}>
          {running ? "Working…" : "Build the growth plan"}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/40">Try:</span>
        {EXAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={running}
            onClick={() => {
              setValue(s);
              submit(s);
            }}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition-colors hover:border-kinetk-cyan/60 hover:text-kinetk-cyan disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

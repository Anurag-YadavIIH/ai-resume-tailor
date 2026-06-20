import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { ChatMessage, ResumeContent } from "../types";
import { tailorApi, apiError, type ChatResult } from "../api";

interface Props {
  tailoredId: string;
  content: ResumeContent;
  chatHistory: ChatMessage[];
  onResult: (result: ChatResult) => void;
}

const QUICK_PROMPTS = [
  "Show only my 2 most relevant projects",
  "Group my skills into categories like Languages, Frameworks, and Tools — one line per category",
  "Make the summary more concise",
];

export default function ChatPanel({ tailoredId, content, chatHistory, onResult }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory.length]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setInput("");
    try {
      const result = await tailorApi.chat(tailoredId, message, content);
      onResult(result);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        {chatHistory.length === 0 && (
          <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-thread" />
            Ask the AI to adjust your resume — e.g. trim projects, group skills,
            tighten the summary. Changes apply directly and save automatically.
          </div>
        )}

        {chatHistory.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-ink text-white"
                : "border border-line bg-canvas text-ink"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {chatHistory.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              className="btn-ghost px-2.5 py-1.5 text-xs"
              onClick={() => send(p)}
              disabled={busy}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-2 rounded-lg border border-bad/30 bg-bad/5 px-4 py-2 text-sm text-bad">
          {error}
        </div>
      )}

      <form
        className="flex shrink-0 items-center gap-2 border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="field"
          placeholder="e.g. Show only my 2 most relevant projects"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn-primary" type="submit" disabled={busy || !input.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

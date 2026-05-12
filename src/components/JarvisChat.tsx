import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "Summarize my recent health trends.",
  "Explain my most recent lab report.",
  "What lifestyle changes might help my symptoms?",
  "What does my last prescription mean?",
];

export function JarvisChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (resp.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", compact ? "h-[520px]" : "h-[calc(100vh-12rem)]")}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-gradient-subtle p-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-hero p-5 text-primary-foreground shadow-glow">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <p className="font-display text-lg font-semibold">Hi, I'm JARVIS</p>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/90">
                Your personal SkinScope AI health assistant. I have access to your scans, lab reports, symptoms, prescriptions, and lifestyle logs.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-muted/40">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card",
            )}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> JARVIS is thinking…
            </div>
          </div>
        )}
      </div>

      <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
          AI-assisted insights only — not a medical diagnosis. Always consult a healthcare professional.
        </AlertDescription>
      </Alert>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-3 flex items-end gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask JARVIS about your health…"
          rows={2}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          className="min-h-[60px] resize-none"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="bg-gradient-hero text-primary-foreground hover:opacity-95">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

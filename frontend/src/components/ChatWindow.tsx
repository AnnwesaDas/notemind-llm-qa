import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles } from "lucide-react";
import CitationChip from "./CitationChip";
import { type ChatMessage } from "@/lib/dummyData";

export interface ChatUiMessage extends ChatMessage {
  // Raw retrieval chunks returned from backend `/api/query`.
  sources?: string[];
}

interface ChatWindowProps {
  resetSignal?: number;
  // Lifted chat state from parent (`Chat.tsx`) so the page owns message/loading lifecycle.
  messages: ChatUiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatUiMessage[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // Filename selected/uploaded in shared parent state.
  uploadedFilename: string | null;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  onAddHistory?: (question: string, document: string) => void;
}

const ChatWindow = ({
  resetSignal = 0,
  messages,
  setMessages,
  loading,
  setLoading,
  uploadedFilename,
  inputValue,
  setInputValue,
  onAddHistory,
}: ChatWindowProps) => {
  const [mode, setMode] = useState<"document" | "assistant">("document");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setInputValue("");
    setLoading(false);
  }, [resetSignal, setLoading, setMessages, setInputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    // Add to history if callback provided
    if (onAddHistory && uploadedFilename) {
      onAddHistory(inputValue, uploadedFilename);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      // Send both question and uploaded filename to backend query endpoint.
      const response = await fetch("http://127.0.0.1:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: inputValue,
          filename: uploadedFilename,
          mode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to get response");
      }

      const data = await response.json();

      const aiMessage: ChatUiMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.answer,
        // Store returned source chunks so they can be rendered below AI answer.
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Something went wrong, please try again",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-6 py-4 border-b border-primary/5">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold tracking-tighter text-foreground">Synthesis Session</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("document")}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              mode === "document"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "glass border-border/50 text-muted-foreground"
            }`}
          >
            Document
          </button>
          <button
            type="button"
            onClick={() => setMode("assistant")}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              mode === "assistant"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "glass border-border/50 text-muted-foreground"
            }`}
          >
            Assistant
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 && !loading && (
          <div className="text-center py-24 animate-fade-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <span className="block text-2xl font-semibold tracking-[-0.01em] leading-snug text-foreground mb-2">
              Synthesize the cosmos of your curriculum
            </span>
            <p className="text-sm tracking-normal leading-relaxed text-muted-foreground max-w-md mx-auto text-wrap-pretty">
              Upload your course materials and ask questions. NoteMind will analyze, cross-reference, and synthesize insights from your documents.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`animate-pop-in flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            {msg.role === "ai" && (
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div className={`max-w-[75%] space-y-2 ${msg.role === "user" ? "text-right" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground rounded-br-md"
                    : "glass rounded-bl-md text-foreground"
                }`}
              >
                {msg.content}
              </div>

              {msg.citations && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.citations.map((c, i) => (
                    <CitationChip key={i} file={c.file} chunk={c.chunk} />
                  ))}
                </div>
              )}

              {/* Show backend source chunks as compact scrollable cards below AI responses. */}
              {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
                <div className="space-y-2">
                  {msg.sources.map((source, sourceIndex) => (
                    <div
                      key={`${msg.id}-source-${sourceIndex}`}
                      className="glass rounded-xl px-3 py-2 text-xs text-muted-foreground max-h-24 overflow-y-auto"
                    >
                      {source}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              <span className="text-xs text-muted-foreground mr-1">Thinking...</span>
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-dot-1" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-dot-2" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-dot-3" />
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={
              mode === "assistant"
                ? "Ask anything..."
                : "Ask a question about your notes..."
            }
            disabled={loading}
            className="flex-1 rounded-xl glass px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim()}
            className="rounded-xl shrink-0 bg-accent text-accent-foreground hover:bg-accent/80 border-0 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
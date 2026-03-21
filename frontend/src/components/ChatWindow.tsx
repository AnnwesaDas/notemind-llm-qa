import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User } from "lucide-react";
import CitationChip from "./CitationChip";
import { type ChatMessage } from "@/lib/dummyData";

const ChatWindow = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.answer,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
                    ? "gradient-violet text-primary-foreground rounded-br-md"
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
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-dot-1" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-dot-2" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground animate-dot-3" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask a question about your notes..."
            disabled={loading}
            className="flex-1 rounded-xl glass px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="rounded-xl shrink-0 gradient-violet border-0 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

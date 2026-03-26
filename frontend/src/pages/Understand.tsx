import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Book, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppSidebar from "@/components/AppSidebar";
import StarField from "@/components/StarField";

interface Citation {
  source: string;
  text: string;
}

interface UnderstandResult {
  question: string;
  answer: string;
  sources: string[];
  timestamp: number;
}

const Understand = () => {
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<UnderstandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!question.trim() || loading) return;

    setLoading(true);
    setCopiedIndex(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          filename: uploadedFilename,
          mode: "document",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch answer");
      }

      const data = await response.json();
      setResults({
        question: data.question,
        answer: data.answer,
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySource = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNewSearch = () => {
    setResults(null);
    setQuestion("");
  };

  return (
    <div className="relative flex h-screen nebula-bg overflow-hidden">
      <StarField />
      <AppSidebar
        onNewChat={handleNewSearch}
        uploadedFilename={uploadedFilename}
        setUploadedFilename={setUploadedFilename}
      />

      <main className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Understand</h2>
              <p className="text-xs text-muted-foreground">Get cited answers linked to exact sources</p>
            </div>
          </div>

          {/* Search input */}
          {!results && (
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about your notes..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                disabled={loading || !uploadedFilename}
                className="glass"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !question.trim() || !uploadedFilename}
                className="bg-accent text-accent-foreground hover:bg-accent/80"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {!results && !loading && (
              <div className="text-center py-20 animate-fade-up">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Book className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-2">Start learning</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {uploadedFilename
                    ? "Ask a question about your notes and get cited answers with exact sources."
                    : "Upload documents to your dashboard first, then ask questions here."}
                </p>
              </div>
            )}

            {loading && (
              <div className="text-center py-20">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-spin">
                    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary" />
                  </div>
                  <span className="text-muted-foreground">Searching your documents...</span>
                </div>
              </div>
            )}

            {results && (
              <div className="space-y-8 animate-fade-up">
                {/* Question */}
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Question</p>
                  <p className="text-xl font-serif text-foreground">{results.question}</p>
                </div>

                {/* Answer */}
                <div className="glass rounded-2xl p-6 border border-primary/20 bg-primary/5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Answer</p>
                  <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">{results.answer}</p>
                </div>

                {/* Sources */}
                {results.sources.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Sources ({results.sources.length})
                      </p>
                    </div>
                    <div className="space-y-3">
                      {results.sources.map((source, index) => (
                        <div
                          key={`${results.timestamp}-${index}`}
                          className="glass rounded-xl p-4 border border-border/50 hover:border-border/80 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <FileText className="h-4 w-4 text-accent mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                {uploadedFilename || "Source"}
                              </p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                {source}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopySource(source, index)}
                              className="shrink-0 p-2 rounded-lg hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy source"
                            >
                              {copiedIndex === index ? (
                                <Check className="h-4 w-4 text-accent" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New search button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleNewSearch}
                    variant="outline"
                    className="glass"
                  >
                    Ask Another Question
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Understand;

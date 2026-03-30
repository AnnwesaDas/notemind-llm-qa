import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ChevronDown } from "lucide-react";
import { getUploadedDocs, hydrateUploadedDocsFromBackend, subscribeUploadedDocs } from "@/lib/uploadedDocs";

interface Citation {
  document_id?: string;
  document_name?: string;
  chunk_index?: number;
  score?: number;
  text?: string;
}

interface DifferencePoint {
  claim?: string;
  doc_a?: { citations?: Citation[]; claim?: string };
  doc_b?: { citations?: Citation[]; claim?: string };
}

interface CompareApiResponse {
  status: "ok" | "insufficient_overlap" | "insufficient_evidence";
  query: string;
  answer: string;
  evidence?: Record<string, Citation[]> & { doc_a?: Citation[]; doc_b?: Citation[] };
  comparison?: {
    differences?: DifferencePoint[];
  };
  rejected_claims?: Array<{ claim: string; reason: string }>;
}

const FALLBACK_DOCS = [
  "CS101_Lecture3.pdf",
  "BIO_Week4.pdf",
  "HIST_Essay.pdf",
  "MATH_Notes.pdf",
];

const Compare = () => {
  const [availableDocs, setAvailableDocs] = useState<string[]>([]);
  const [docA, setDocA] = useState<string | null>(null);
  const [docB, setDocB] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareApiResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    void hydrateUploadedDocsFromBackend();

    const sync = () => {
      const uploaded = getUploadedDocs().map((doc) => doc.filename);
      const unique = Array.from(new Set(uploaded));
      setAvailableDocs(unique.length > 0 ? unique : FALLBACK_DOCS);
    };

    sync();
    const unsubscribe = subscribeUploadedDocs(sync);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (docA && !availableDocs.includes(docA)) {
      setDocA(null);
    }
    if (docB && !availableDocs.includes(docB)) {
      setDocB(null);
    }
  }, [availableDocs, docA, docB]);

  const sameDocError = Boolean(docA && docB && docA === docB);
  const shortQuestionError = question.trim().length > 0 && question.trim().length < 10;

  const canCompare =
    Boolean(docA) &&
    Boolean(docB) &&
    question.trim().length >= 10 &&
    !sameDocError &&
    !isLoading;

  const headerA = docA;
  const headerB = docB;

  const extractEvidenceTexts = (response: CompareApiResponse | null, docId: string | null, side: "a" | "b") => {
    if (!response || !docId) {
      return [];
    }

    const evidence = response.evidence || {};
    const direct = side === "a" ? evidence.doc_a : evidence.doc_b;
    const byId = evidence[docId] || [];

    const fromDifferences = (response.comparison?.differences || []).flatMap((diff) => {
      const citations = side === "a" ? diff.doc_a?.citations : diff.doc_b?.citations;
      return (citations || []).map((c) => c.text || "").filter(Boolean);
    });

    const merged = [
      ...direct.map((c) => c.text || ""),
      ...byId.map((c) => c.text || ""),
      ...fromDifferences,
    ].filter(Boolean);

    return Array.from(new Set(merged)).slice(0, 4);
  };

  const docAEvidence = extractEvidenceTexts(result, docA, "a");
  const docBEvidence = extractEvidenceTexts(result, docB, "b");

  const runCompare = async () => {
    if (!canCompare) {
      return;
    }

    setIsLoading(true);
    setResult(null);
    setRequestError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: question.trim(),
          document_ids: [docA, docB],
          mode: "compare",
        }),
      });

      if (!response.ok) {
        const detailText = await response.text();
        throw new Error(detailText || "Compare request failed");
      }

      const data = (await response.json()) as CompareApiResponse;
      setResult(data);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to compare documents right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const helperText = useMemo(() => {
    if (sameDocError) {
      return "Document A and Document B must be different.";
    }
    if (shortQuestionError) {
      return "Question must be at least 10 characters.";
    }
    return "Select two documents and ask a focused compare question.";
  }, [sameDocError, shortQuestionError]);

  return (
    <div className="min-h-screen bg-background">
      <style>
        {`
          @keyframes compare-slide-left {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes compare-slide-right {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes compare-slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <nav className="border-b border-border/50 px-6 py-3 flex items-center gap-4 backdrop-blur-sm sticky top-0 z-20 bg-background/80">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <h1 className="font-serif text-xl text-foreground">Compare Mode</h1>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="glass rounded-2xl p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Document A</p>
              <div className="relative">
                <select
                  value={docA ?? ""}
                  onChange={(event) => setDocA(event.target.value || null)}
                  className="w-full appearance-none rounded-xl border border-border/60 bg-background/50 px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-cyan-400/70 focus:ring-1 focus:ring-cyan-400/50 border-l-2 border-l-cyan-400"
                >
                  <option value="">Select first document</option>
                  {availableDocs.map((doc) => (
                    <option key={`a-${doc}`} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>

            <label className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Document B</p>
              <div className="relative">
                <select
                  value={docB ?? ""}
                  onChange={(event) => setDocB(event.target.value || null)}
                  className={`w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm text-foreground outline-none focus:ring-1 bg-background/50 border-l-2 border-l-violet-400 ${
                    sameDocError
                      ? "border-red-400/70 focus:border-red-400/70 focus:ring-red-400/50"
                      : "border-border/60 focus:border-violet-400/70 focus:ring-violet-400/50"
                  }`}
                >
                  <option value="">Select second document</option>
                  {availableDocs.map((doc) => (
                    <option key={`b-${doc}`} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Question</p>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="How do these documents explain this differently?"
                className={`flex-1 rounded-xl border bg-background/50 px-4 py-3 text-sm text-foreground outline-none ${
                  shortQuestionError
                    ? "border-red-400/70 focus:border-red-400/70"
                    : "border-border/60 focus:border-primary/60"
                }`}
              />
              <Button
                onClick={runCompare}
                disabled={!canCompare}
                className="rounded-xl px-6 bg-gradient-to-r from-primary to-accent text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Comparing...
                  </span>
                ) : (
                  "Compare ->"
                )}
              </Button>
            </div>
            <p className={`text-xs ${sameDocError || shortQuestionError ? "text-red-400" : "text-muted-foreground"}`}>
              {helperText}
            </p>
          </div>
        </section>

        {requestError && (
          <section className="glass rounded-2xl p-4 border border-red-400/40 bg-red-500/10">
            <p className="text-sm text-red-300">{requestError}</p>
          </section>
        )}

        {isLoading && (
          <section className="glass rounded-2xl p-6">
            <p className="text-center text-sm text-muted-foreground mb-5">Synthesizing across documents...</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="h-4 rounded bg-muted/40 w-2/3" />
                  <div className="h-24 rounded-xl bg-muted/30" />
                  <div className="h-24 rounded-xl bg-muted/25" />
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && !result && (
          <section className="glass rounded-2xl p-8 text-center">
            <div className="mx-auto w-fit flex items-center gap-4 text-muted-foreground/80">
              <div className="h-14 w-14 rounded-2xl border border-border/60 bg-background/40 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium uppercase tracking-widest">vs</span>
              <div className="h-14 w-14 rounded-2xl border border-border/60 bg-background/40 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Select two documents and ask a question to compare
            </p>
          </section>
        )}

        {!isLoading && result && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div style={{ animation: "compare-slide-left 0.45s ease forwards" }} className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-cyan-300">
                {headerA ?? "Document A"}
              </h3>
              {docAEvidence.map((quote, idx) => (
                <article key={`a-evidence-${idx}`} className="glass rounded-xl p-4 border-l-2 border-l-cyan-400/90">
                  <p className="text-sm leading-relaxed text-foreground">{quote}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-cyan-300/90">
                    Evidence from {headerA ?? "Document A"}
                  </p>
                </article>
              ))}
              {docAEvidence.length === 0 && (
                <article className="glass rounded-xl p-4 border-l-2 border-l-cyan-400/90">
                  <p className="text-sm leading-relaxed text-muted-foreground">No strong evidence returned for this document.</p>
                </article>
              )}
            </div>

            <div
              style={{ animation: "compare-slide-up 0.45s ease 0.1s forwards", opacity: 0 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary text-center">⚡ Synthesis</h3>
              <article className="rounded-2xl p-5 border border-primary/40 bg-primary/10 shadow-[0_0_28px_rgba(124,58,237,0.18)]">
                <span className="inline-flex rounded-full border border-primary/40 bg-primary/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-primary font-medium">
                  {result.status === "ok" ? "AI Analysis" : "Cautious Analysis"}
                </span>
                <p className="mt-4 font-serif text-base leading-8 text-foreground/95">{result.answer}</p>
                {result.status !== "ok" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Comparison is intentionally withheld because shared evidence is weak or insufficient.
                  </p>
                )}
                {result.rejected_claims && result.rejected_claims.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Rejected claims</p>
                    {result.rejected_claims.slice(0, 2).map((item, idx) => (
                      <p key={`rejected-${idx}`} className="text-xs text-muted-foreground">
                        {item.reason}: {item.claim}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            </div>

            <div style={{ animation: "compare-slide-right 0.45s ease forwards" }} className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-violet-300">
                {headerB ?? "Document B"}
              </h3>
              {docBEvidence.map((quote, idx) => (
                <article key={`b-evidence-${idx}`} className="glass rounded-xl p-4 border-l-2 border-l-violet-400/90">
                  <p className="text-sm leading-relaxed text-foreground">{quote}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-violet-300/90">
                    Evidence from {headerB ?? "Document B"}
                  </p>
                </article>
              ))}
              {docBEvidence.length === 0 && (
                <article className="glass rounded-xl p-4 border-l-2 border-l-violet-400/90">
                  <p className="text-sm leading-relaxed text-muted-foreground">No strong evidence returned for this document.</p>
                </article>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Compare;

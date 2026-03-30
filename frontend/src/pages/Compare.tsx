import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ChevronDown } from "lucide-react";
import { getUploadedDocs, subscribeUploadedDocs } from "@/lib/uploadedDocs";

interface CompareResult {
  docAEvidence: string[];
  docBEvidence: string[];
  synthesis: string;
  question: string;
}

const FALLBACK_DOCS = [
  "CS101_Lecture3.pdf",
  "BIO_Week4.pdf",
  "HIST_Essay.pdf",
  "MATH_Notes.pdf",
];

function getMockResult(question: string): CompareResult {
  const normalized = question.toLowerCase();

  if (normalized.includes("explain") || normalized.includes("define")) {
    return {
      docAEvidence: [
        "TCP establishes a connection using a three-way handshake before any data is transmitted, ensuring both parties are ready.",
        "Packet acknowledgment in TCP means every segment sent must be confirmed received - dropped packets are retransmitted automatically.",
      ],
      docBEvidence: [
        "UDP sends datagrams without establishing a connection first, making it significantly faster for time-sensitive applications.",
        "In UDP, there is no guarantee of delivery or ordering - the application layer must handle any error correction if needed.",
      ],
      synthesis:
        "Both documents agree that TCP and UDP serve fundamentally different purposes. CS101 emphasizes TCP's reliability mechanisms (handshake, acknowledgment, retransmission) as essential for data integrity. BIO Week 4 contrasts this by highlighting UDP's stateless speed - ideal where losing a packet is acceptable. The key insight across both: choose your protocol based on whether correctness or speed is the priority.",
      question,
    };
  }

  if (normalized.includes("process") || normalized.includes("stage") || normalized.includes("step")) {
    return {
      docAEvidence: [
        "Glycolysis occurs in the cytoplasm and breaks glucose into two pyruvate molecules, yielding a net gain of 2 ATP.",
        "The Krebs cycle runs in the mitochondrial matrix, producing NADH and FADH2 as electron carriers for the next stage.",
      ],
      docBEvidence: [
        "Oxidative phosphorylation in the inner mitochondrial membrane uses the electron transport chain to generate up to 34 ATP.",
        "The entire cellular respiration process converts one glucose molecule into approximately 36-38 ATP molecules total.",
      ],
      synthesis:
        "Both sources frame cellular respiration as a three-stage cascade. The first doc details the early anaerobic stage (glycolysis) while the second focuses on the high-yield aerobic stages. Together they show that the majority of ATP - roughly 90% - is produced in the final oxidative phosphorylation stage, making mitochondrial function critical to cellular energy.",
      question,
    };
  }

  return {
    docAEvidence: [
      "The foundational concepts outlined here establish a framework for understanding the broader theoretical model.",
      "Key terminology is defined early and consistently applied throughout subsequent sections of the document.",
    ],
    docBEvidence: [
      "This source approaches the same topic from an applied perspective, using case studies and real-world examples.",
      "The methodology differs significantly - favoring empirical observation over theoretical derivation.",
    ],
    synthesis:
      "These two documents approach the subject from complementary angles. The first builds a theoretical foundation while the second validates concepts through practical application. Students would benefit from reading both in sequence - theory first, then application.",
    question,
  };
}

const Compare = () => {
  const [availableDocs, setAvailableDocs] = useState<string[]>([]);
  const [docA, setDocA] = useState<string | null>(null);
  const [docB, setDocB] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
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

  const headerA = result ? docA : docA;
  const headerB = result ? docB : docB;

  const runCompare = () => {
    if (!canCompare) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    window.setTimeout(() => {
      setResult(getMockResult(question.trim()));
      setIsLoading(false);
    }, 2000);
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
              {result.docAEvidence.map((quote, idx) => (
                <article key={`a-evidence-${idx}`} className="glass rounded-xl p-4 border-l-2 border-l-cyan-400/90">
                  <p className="text-sm leading-relaxed text-foreground">{quote}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-cyan-300/90">
                    Evidence from {headerA ?? "Document A"}
                  </p>
                </article>
              ))}
            </div>

            <div
              style={{ animation: "compare-slide-up 0.45s ease 0.1s forwards", opacity: 0 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary text-center">⚡ Synthesis</h3>
              <article className="rounded-2xl p-5 border border-primary/40 bg-primary/10 shadow-[0_0_28px_rgba(124,58,237,0.18)]">
                <span className="inline-flex rounded-full border border-primary/40 bg-primary/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-primary font-medium">
                  AI Analysis
                </span>
                <p className="mt-4 font-serif text-base leading-8 text-foreground/95">{result.synthesis}</p>
              </article>
            </div>

            <div style={{ animation: "compare-slide-right 0.45s ease forwards" }} className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-violet-300">
                {headerB ?? "Document B"}
              </h3>
              {result.docBEvidence.map((quote, idx) => (
                <article key={`b-evidence-${idx}`} className="glass rounded-xl p-4 border-l-2 border-l-violet-400/90">
                  <p className="text-sm leading-relaxed text-foreground">{quote}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-violet-300/90">
                    Evidence from {headerB ?? "Document B"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Compare;

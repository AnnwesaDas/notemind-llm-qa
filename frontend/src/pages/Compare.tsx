import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ChevronDown } from "lucide-react";
import { getUploadedDocs, subscribeUploadedDocs, type UploadedDoc } from "@/lib/uploadedDocs";

const Compare = () => {
  const [docs, setDocs] = useState<UploadedDoc[]>(getUploadedDocs());

  useEffect(() => {
    const sync = () => setDocs(getUploadedDocs());
    const unsubscribe = subscribeUploadedDocs(sync);
    return unsubscribe;
  }, []);

  const docA = docs[0];
  const docB = docs[1];
  const canCompare = Boolean(docA && docB);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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
        {/* Doc selectors */}
        <div className="flex items-center gap-4 justify-center">
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 min-w-[200px]">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground">{docA?.filename ?? "Upload first document"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          </div>
          <span className="text-muted-foreground text-sm font-medium">vs</span>
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 min-w-[200px]">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-sm text-foreground">{docB?.filename ?? "Upload second document"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          </div>
        </div>

        {/* Question */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">Question</p>
          <p className="text-foreground font-medium">
            {canCompare
              ? "Comparison endpoint is not connected yet. Use Chat to ask focused questions per document."
              : "Upload at least 2 documents to compare."}
          </p>
        </div>

        {canCompare && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Doc A evidence */}
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wider">
                {docA.filename}
              </h3>
              <div className="glass rounded-xl p-4 border-l-2 border-amber-500/50">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Ready for comparison once backend compare analysis is connected.
                </p>
              </div>
            </div>

            {/* Synthesis */}
            <div className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <h3 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
                Synthesis
              </h3>
              <div className="rounded-2xl p-5 border border-primary/30 bg-primary/5 glow-violet">
                <p className="font-serif text-base text-foreground leading-relaxed">
                  No sample synthesis shown. Connect a compare backend route to generate real side-by-side analysis.
                </p>
              </div>
            </div>

            {/* Doc B evidence */}
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">
                {docB.filename}
              </h3>
              <div className="glass rounded-xl p-4 border-l-2 border-blue-500/50">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Ready for comparison once backend compare analysis is connected.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Compare;

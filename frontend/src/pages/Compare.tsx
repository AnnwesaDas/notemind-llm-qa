import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ChevronDown } from "lucide-react";
import { documents, courseColorMap } from "@/lib/dummyData";

const compareData = {
  question: "How do sorting algorithms differ in their approach to organizing data?",
  docA: {
    name: "CS101_Lecture3.pdf",
    evidence: [
      { text: "Merge sort uses a divide-and-conquer strategy, recursively splitting the array into halves until single elements remain, then merging them back in sorted order.", highlight: "amber" },
      { text: "The key advantage of merge sort is its guaranteed O(n log n) time complexity regardless of input distribution.", highlight: "amber" },
    ],
  },
  docB: {
    name: "MATH_Notes.pdf",
    evidence: [
      { text: "Quick sort selects a pivot element and partitions the array such that elements smaller than the pivot go left, and larger go right.", highlight: "blue" },
      { text: "While quick sort averages O(n log n), its worst-case is O(n²) when the pivot selection is consistently poor.", highlight: "blue" },
      { text: "In practice, quick sort often outperforms merge sort due to better cache locality and lower constant factors.", highlight: "blue" },
    ],
  },
  synthesis: "Both merge sort and quick sort employ divide-and-conquer strategies but differ fundamentally in approach. Merge sort guarantees O(n log n) by splitting first and merging in order, while quick sort partitions around a pivot with better practical performance but worse worst-case guarantees. The choice depends on whether consistency (merge sort) or average-case speed (quick sort) is prioritized.",
};

const Compare = () => {
  const [docA, setDocA] = useState(documents[0]);
  const [docB, setDocB] = useState(documents[3]);
  const [asked, setAsked] = useState(true);

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
          <div className="h-7 w-7 rounded-md gradient-violet flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-xl text-foreground">Compare Mode</h1>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Doc selectors */}
        <div className="flex items-center gap-4 justify-center">
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 min-w-[200px]">
            <span className={`h-2 w-2 rounded-full ${courseColorMap[docA.courseColor].split(" ")[0]}`} />
            <span className="text-sm text-foreground">{docA.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          </div>
          <span className="text-muted-foreground text-sm font-medium">vs</span>
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 min-w-[200px]">
            <span className={`h-2 w-2 rounded-full ${courseColorMap[docB.courseColor].split(" ")[0]}`} />
            <span className="text-sm text-foreground">{docB.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          </div>
        </div>

        {/* Question */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">Question</p>
          <p className="text-foreground font-medium">{compareData.question}</p>
        </div>

        {asked && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Doc A evidence */}
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wider">
                {compareData.docA.name}
              </h3>
              {compareData.docA.evidence.map((e, i) => (
                <div key={i} className="glass rounded-xl p-4 border-l-2 border-amber-500/50">
                  <p className="text-sm text-foreground/90 leading-relaxed">{e.text}</p>
                </div>
              ))}
            </div>

            {/* Synthesis */}
            <div className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <h3 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
                Synthesis
              </h3>
              <div className="rounded-2xl p-5 border border-primary/30 bg-primary/5 glow-violet">
                <p className="font-serif text-base text-foreground leading-relaxed">{compareData.synthesis}</p>
              </div>
            </div>

            {/* Doc B evidence */}
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">
                {compareData.docB.name}
              </h3>
              {compareData.docB.evidence.map((e, i) => (
                <div key={i} className="glass rounded-xl p-4 border-l-2 border-blue-500/50">
                  <p className="text-sm text-foreground/90 leading-relaxed">{e.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Compare;

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowLeft, ArrowRight, RotateCcw, Check } from "lucide-react";
import { dummyFlashcards } from "@/lib/dummyData";
import confetti from "canvas-confetti";

const Flashcards = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const total = dummyFlashcards.length;
  const card = dummyFlashcards[currentIndex];

  const flip = useCallback(() => setIsFlipped((f) => !f), []);

  const next = useCallback(() => {
    if (currentIndex < total - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((i) => i + 1), 150);
    } else {
      setCompleted(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [currentIndex, total]);

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((i) => i - 1), 150);
    }
  }, [currentIndex]);

  const restart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); flip(); }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, next, prev]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-3 flex items-center gap-4 backdrop-blur-sm">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <h1 className="font-serif text-xl text-foreground">Flashcards</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {total}
          </span>
          <Progress value={((currentIndex + 1) / total) * 100} className="w-32 h-2 bg-secondary" />
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {completed ? (
          <div className="text-center space-y-6 animate-fade-up">
            <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center mx-auto glow-violet">
              <Check className="h-10 w-10 text-accent-foreground" />
            </div>
            <h2 className="font-serif text-3xl text-foreground">Deck Complete!</h2>
            <p className="text-muted-foreground">You reviewed all {total} cards. Nice work!</p>
            <Button onClick={restart} className="bg-accent text-accent-foreground hover:bg-accent/80 border-0 rounded-xl">
              <RotateCcw className="h-4 w-4 mr-2" /> Start Over
            </Button>
          </div>
        ) : (
          <>
            {/* Card */}
            <div className="perspective-1000 w-full max-w-lg cursor-pointer" onClick={flip}>
              <div className={`preserve-3d transition-transform duration-500 relative ${isFlipped ? "rotate-y-180" : ""}`} style={{ minHeight: 280 }}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden glass glass-hover rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <span className="text-6xl text-primary/20 font-serif absolute top-6 right-8 select-none">?</span>
                  <p className="font-serif text-xl text-foreground leading-relaxed">{card.question}</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-primary/30 bg-primary/5 glow-violet">
                  <Check className="h-6 w-6 text-primary mb-4" />
                  <p className="text-foreground leading-relaxed">{card.answer}</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-10">
              <Button variant="outline" size="icon" onClick={prev} disabled={currentIndex === 0} className="rounded-xl glass border-border/50">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button onClick={flip} variant="outline" className="rounded-xl glass border-border/50 px-6">
                Flip
              </Button>
              <Button variant="outline" size="icon" onClick={next} className="rounded-xl glass border-border/50">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              <kbd className="glass rounded px-1.5 py-0.5 text-foreground">Space</kbd> flip · <kbd className="glass rounded px-1.5 py-0.5 text-foreground">→</kbd> next · <kbd className="glass rounded px-1.5 py-0.5 text-foreground">←</kbd> prev
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default Flashcards;

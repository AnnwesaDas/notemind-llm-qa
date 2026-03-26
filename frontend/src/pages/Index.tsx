import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, MessageSquare, Sparkles, FileText } from "lucide-react";

const features = [
  { icon: Upload, title: "Upload", description: "Drag & drop your PDFs, slides, and documents", path: "/dashboard" },
  { icon: MessageSquare, title: "Ask", description: "Chat with your notes using AI-powered Q&A", path: "/chat" },
  { icon: Sparkles, title: "Understand", description: "Get cited answers linked to exact sources", path: "/dashboard" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-blob-1 absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="aurora-blob-2 absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[100px]" />
        <div className="aurora-blob-3 absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-border/50 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            <span className="text-primary">Note</span>
            <span className="text-foreground">Mind</span>
          </span>
        </div>
        <Link to="/dashboard">
          <Button size="sm" variant="outline" className="glass border-border/60 text-foreground hover:bg-surface-hover">Go to Dashboard</Button>
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-Powered Study Assistant
          </div>

          <h1 className="animate-fade-up font-serif text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-foreground leading-[1.1]" style={{ animationDelay: "0.1s" }}>
            Your notes.{" "}
            <br className="hidden sm:block" />
            Your questions.{" "}
            <br className="hidden sm:block" />
            <span className="text-gradient">Instant answers.</span>
          </h1>

          <p className="animate-fade-up text-lg text-muted-foreground max-w-lg mx-auto" style={{ animationDelay: "0.2s" }}>
            An AI-powered study assistant for multi-document learning. Upload your lectures, notes, and slides — then ask questions across all of them.
          </p>

          <div className="animate-fade-up flex gap-3 justify-center pt-2" style={{ animationDelay: "0.3s" }}>
            <Link to="/dashboard">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/80 border-0 rounded-xl px-8 text-base glow-violet transition-colors">
                Get Started
              </Button>
            </Link>
            <Link to="/chat">
              <Button size="lg" variant="outline" className="rounded-xl px-8 text-base glass">
                Try Chat
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating doc mockup */}
        <div className="animate-fade-up mt-16 relative" style={{ animationDelay: "0.4s" }}>
          <div className="glass rounded-2xl p-5 w-72 rotate-[6deg] glow-violet">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">CS101_Lecture3.pdf</p>
                <p className="text-xs text-muted-foreground">4,280 words</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted w-full" />
              <div className="h-2 rounded-full bg-muted w-4/5" />
              <div className="h-2 rounded-full bg-muted w-3/5" />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-3xl w-full">
          {features.map((f, i) => (
            <button
              key={f.title}
              onClick={() => navigate(f.path)}
              className="animate-fade-up glass glass-hover rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            >
              <div className="mx-auto h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-serif text-xl text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </button>
          ))}
        </div>
      </main>

      <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground">
        Built with NoteMind — Your AI study companion
      </footer>
    </div>
  );
};

export default Index;

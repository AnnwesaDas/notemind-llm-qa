import { Clock, FileText, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import DocSelector from "./DocSelector";

const memoryHistory = [
  { id: "h1", title: "Quantum Mechanics Review", date: "2 hours ago" },
  { id: "h2", title: "Biology Exam Prep", date: "Yesterday" },
  { id: "h3", title: "Calculus Problem Set", date: "3 days ago" },
];

interface AppSidebarProps {
  onNewChat?: () => void;
}

const AppSidebar = ({ onNewChat }: AppSidebarProps) => {
  return (
    <aside className="relative z-10 w-[280px] border-r border-border/50 bg-sidebar/90 backdrop-blur-sm flex flex-col h-full shrink-0">
      <div className="px-6 py-4 border-b border-border/50">
        <Link to="/" className="inline-flex items-center">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            <span className="text-primary">Note</span>
            <span className="text-foreground">Mind</span>
          </span>
        </Link>
        <p className="text-[11px] text-muted-foreground mt-1 font-mono tracking-wider uppercase">Academic Synthesis Engine</p>
        <button
          onClick={onNewChat}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium transition-colors"
          type="button"
        >
          New Chat
        </button>
      </div>

      <div className="px-3 py-3 flex-1 overflow-y-auto space-y-6">
        <section className="glass-panel rounded-2xl px-3 pb-3 pt-4">
          <div className="flex items-center gap-2 px-3 mb-2 mt-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium text-foreground uppercase tracking-wider">Knowledge Base</p>
          </div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Selectable Context</p>
            <span className="text-[10px] text-primary font-medium">2 active</span>
          </div>
          <DocSelector compact />
        </section>

        <section className="glass-panel rounded-2xl px-3 pb-3 pt-4">
          <div className="flex items-center gap-2 px-3 mb-2 mt-2">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <p className="text-xs font-medium text-foreground uppercase tracking-wider">Memory Bank</p>
          </div>

          <div className="space-y-1 px-1">
            {memoryHistory.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-secondary/45 transition-colors text-left"
                type="button"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.date}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default AppSidebar;

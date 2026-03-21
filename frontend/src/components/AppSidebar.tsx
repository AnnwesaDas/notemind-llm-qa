import { Sparkles } from "lucide-react";
import DocSelector from "./DocSelector";

const AppSidebar = () => {
  return (
    <aside className="w-[260px] border-r border-border/50 bg-sidebar flex flex-col h-full shrink-0">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <div className="h-7 w-7 rounded-md gradient-violet flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground">NoteMind</span>
      </div>

      <div className="px-3 py-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Context
          </p>
          <span className="text-xs text-primary font-medium">2 active</span>
        </div>
        <DocSelector />
      </div>
    </aside>
  );
};

export default AppSidebar;

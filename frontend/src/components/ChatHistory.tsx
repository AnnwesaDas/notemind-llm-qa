import { Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChatHistory, deleteHistoryItem } from "@/lib/chatHistory";
import { useState, useEffect } from "react";

interface ChatHistoryProps {
  onSelectHistory: (question: string) => void;
}

export const ChatHistory = ({ onSelectHistory }: ChatHistoryProps) => {
  const [history, setHistory] = useState(getChatHistory());

  useEffect(() => {
    setHistory(getChatHistory());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    setHistory(getChatHistory());
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (history.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        No chat history yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {history.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelectHistory(item.question)}
          className="group p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors text-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate font-medium">
                {item.question.slice(0, 50)}...
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {item.document}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {formatTime(item.timestamp)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              onClick={(e) => handleDelete(item.id, e)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
import { ChatHistory } from "@/components/ChatHistory";
import { addToHistory } from "@/lib/chatHistory";
import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import ChatWindow, { type ChatUiMessage } from "@/components/ChatWindow";
import StarField from "@/components/StarField";

const Chat = () => {
  const [resetSignal, setResetSignal] = useState(0);
  // Lifted shared state for Day 5 integration.
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleNewChat = () => {
    setResetSignal((value) => value + 1);
    setMessages([]);
    setLoading(false);
  };

  return (
    <div className="relative flex h-screen nebula-bg overflow-hidden">
      <StarField />
      <AppSidebar
        onNewChat={handleNewChat}
        uploadedFilename={uploadedFilename}
        setUploadedFilename={setUploadedFilename}
      >
        <div className="px-3 py-3 border-t border-border/50 mt-4">
          <div className="flex items-center gap-2 px-3 mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Queries</span>
          </div>
          <ChatHistory onSelectHistory={(q) => setInputValue(q)} />
        </div>
      </AppSidebar>
      <main className="relative z-10 flex-1 flex flex-col min-w-0">
        <ChatWindow
          resetSignal={resetSignal}
          messages={messages}
          setMessages={setMessages}
          loading={loading}
          setLoading={setLoading}
          uploadedFilename={uploadedFilename}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onAddHistory={addToHistory}
        />
      </main>
    </div>
  );
};

export default Chat;
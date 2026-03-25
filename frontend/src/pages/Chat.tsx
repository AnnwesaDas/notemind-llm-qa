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
      />
      <main className="relative z-10 flex-1 flex flex-col min-w-0">
        <ChatWindow
          resetSignal={resetSignal}
          messages={messages}
          setMessages={setMessages}
          loading={loading}
          setLoading={setLoading}
          uploadedFilename={uploadedFilename}
        />
      </main>
    </div>
  );
};

export default Chat;

import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import ChatWindow from "@/components/ChatWindow";
import StarField from "@/components/StarField";

const Chat = () => {
  const [resetSignal, setResetSignal] = useState(0);

  return (
    <div className="relative flex h-screen nebula-bg overflow-hidden">
      <StarField />
      <AppSidebar onNewChat={() => setResetSignal((value) => value + 1)} />
      <main className="relative z-10 flex-1 flex flex-col min-w-0">
        <ChatWindow resetSignal={resetSignal} />
      </main>
    </div>
  );
};

export default Chat;

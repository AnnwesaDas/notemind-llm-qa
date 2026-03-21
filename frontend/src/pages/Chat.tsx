import AppSidebar from "@/components/AppSidebar";
import ChatWindow from "@/components/ChatWindow";

const Chat = () => {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatWindow />
      </main>
    </div>
  );
};

export default Chat;

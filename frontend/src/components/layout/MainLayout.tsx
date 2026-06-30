import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { useLocalUser } from "@/hooks/useLocalUser";

export function MainLayout() {
  const user = useLocalUser();

  return (
    <div className="flex h-svh flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar userId={user.id} />
        <ChatArea user={user} />
      </div>
    </div>
  );
}

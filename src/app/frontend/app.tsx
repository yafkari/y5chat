import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import ChatPage from "./pages/chat-page";
import NotFound from "./pages/not-found";
import { ConvexClientProvider } from "./providers/convex-client-provider";
import AppCommand from "./components/app-command";
import { useEffect } from "react";
import useCommand from "@/hooks/use-command";
import { Toaster } from "sonner";
import SettingsPage from "./pages/settings";

export default function App() {
  const { toggle } = useCommand();

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    }

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  return (
    <ConvexClientProvider>
      <BrowserRouter>
        <AppCommand />
        <Routes>
          <Route path="/" element={<Navigate to="/chat" />} />
          <Route path="/chat/:threadId?" element={<ChatPage />} />
          <Route path="/settings" element={<Navigate to="/settings/account" />} />
          <Route path="/settings/:tab?" element={<SettingsPage />} />
          {/* <Route path="/latest" element={<LatestChatHelper />} /> */}
          {/* <Route path="/new" element={<NewChatHelper />} /> */}
          {/* <Route path="/auth" element={<AuthPage />} /> */}
          {/* <Route path="/auth/complete" element={<AuthCompletePage />} /> */}
          {/* <Route path="/success" element={<SuccessPage />} /> */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ConvexClientProvider>
  );
}

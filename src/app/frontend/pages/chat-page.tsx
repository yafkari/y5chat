import Chat from "../components/chat";
import Sidebar from "../components/sidebar";
import Layout from "./layout";

export default function ChatPage() {
  return (
    <Layout>
      <div className="fixed inset-0 flex max-w-screen dark:bg-[#1A1A1A] dark:text-gray-100">
        <Sidebar />
        <Chat />
      </div>
    </Layout>
  )
}
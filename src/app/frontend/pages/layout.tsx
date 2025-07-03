import { SidebarProvider } from "@/components/ui/sidebar";
import { FloatingThemeTrigger } from "../components/floating-theme-trigger";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <FloatingThemeTrigger />
      {children}
    </SidebarProvider>
  );
}

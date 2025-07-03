import { Button } from "@/components/ui/button";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";
import { useNavigate } from "react-router";

export default function NewChatButton() {
  const navigate = useNavigate();
  const { open } = useSidebar();

  return (
    <SidebarMenuItem className="list-none">
      <SidebarMenuButton asChild>
        <Button
          variant="secondary"
          className={cn(
            "w-full text-base py-5 hover:bg-amber-500/50 transition-colors duration-100",
            !open && "ml-1"
          )}
          onClick={() => navigate("/chat")}
        >
          <PlusIcon className="h-4 w-4" /> {open ? <span>New Chat</span> : null}
        </Button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

"use client";

import {
  Sidebar as SidebarBase,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { cn } from "@/lib/utils";
import NewChatButton from "./sidebar/new-chat-button";
import SearchThreadsButton from "./sidebar/search-threads-button";
import { NavUser } from "./sidebar/nav-user";
import { memo } from "react";
import { PanelLeft } from "lucide-react";
import useConfirm from "./use-confirm";
import { Button } from "@/components/ui/button";
import ThreadItem from "./sidebar/thread-item";
import useEphemeralSettings from "@/hooks/use-ephemeral-settings";

type SidebarProps = React.ComponentProps<typeof SidebarBase>;

function Sidebar({ ...props }: SidebarProps) {
  const { open: isSidebarOpen, toggleSidebar } = useSidebar();
  const threads = useSessionQuery(api.threads.get);
  const { threadSearchFilter } = useEphemeralSettings();

  const { ConfirmationDialog, confirm } = useConfirm(
    "Are you sure?",
    "By deleting this chat, you will lose all your messages and history."
  );

  return (
    <>
      <ConfirmationDialog />
      <SidebarBase
        collapsible="icon"
        className={cn(
          props.className,
          "data-[state=closed]:duration-100 group-data-[side=left]:border-0 select-none"
        )}
        {...props}
      >
        <SidebarHeader className="pt-2.5">
          <SidebarMenu>
            <SidebarMenuItem>
              {isSidebarOpen ? (
                <SidebarMenuButton
                  asChild
                  className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-transparent"
                >
                  <h1 className="flex h-8 shrink-0 items-center justify-center text-lg text-muted-foreground transition-opacity delay-75 duration-75">
                    <a
                      href="/"
                      className="relative flex h-8 w-24 items-center justify-center text-lg font-semibold text-primary select-none"
                    >
                      Y5.chat
                    </a>
                  </h1>
                </SidebarMenuButton>
              ) : null}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent
          className={cn(
            "px-2 pr-1 overflow-y-auto",
            "scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-primary/90 dark:scrollbar-thumb-secondary scrollbar-track-transparent",
            !isSidebarOpen && "pl-1",
            isSidebarOpen && "pr-2"
          )}
        >
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "z-10 h-8 w-8 text-primary ml-1",
                "hover:bg-muted/40 hover:secondary-foreground",
                "disabled:hover:bg-transparent disabled:hover:text-foreground/50"
              )}
              data-sidebar="trigger"
            >
              <PanelLeft className="h-8 w-8" strokeWidth={2.5} />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
          <NewChatButton />
          <SearchThreadsButton />
          <hr />
          <div
            className={cn(
              "flex flex-col gap-1 overflow-y-visible mr-0 flex-1",
              !isSidebarOpen && "overflow-y-scroll hide-scrollbar items-center"
            )}
            style={{
              scrollbarGutter: "auto",
            }}
          >
            {threads?.filter((thread) => thread.title.toLowerCase().includes(threadSearchFilter.toLowerCase()))?.map((thread) => (
              <ThreadItem
                thread={thread}
                key={thread.threadId}
                confirm={confirm}
              />
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </SidebarBase>
    </>
  );
}

export default memo(Sidebar);

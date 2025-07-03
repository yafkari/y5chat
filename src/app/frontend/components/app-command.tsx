import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResponsiveDialog,
} from "@/components/ui/command";
import { useState } from "react";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";
import EmojiViewer from "./emoji-viewer";
import useCommand from "@/hooks/use-command";
import { useNavigate } from "react-router";

export default function AppCommand() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { isOpen, setIsOpen } = useCommand();
  const threads = useSessionQuery(api.threads.get); // TODO: pass search here

  return (
    <CommandResponsiveDialog
      shouldFilter={false}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CommandInput
        placeholder="Find a chat..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandGroup heading="Chats">
          <CommandEmpty>
            <span>No chats found</span>
          </CommandEmpty>
          {threads
            ?.filter((thread) =>
              thread.title.toLowerCase().includes(search.toLowerCase())
            )
            .map((thread) => (
              <CommandItem
                key={thread._id}
                value={thread.threadId}
                onSelect={() => {
                  navigate(`/chat/${thread.threadId}`);
                  setIsOpen(false);
                }}
              >
                <EmojiViewer emoji={thread.emoji} /> {thread.title}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandResponsiveDialog>
  );
}

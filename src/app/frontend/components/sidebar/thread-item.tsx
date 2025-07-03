import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { type Thread } from "@/convex/schema";
import { useMutation } from "convex/react";
import { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "@ferrucc-io/emoji-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, X } from "lucide-react";
import EmojiViewer from "../emoji-viewer";
import { api } from "@/convex/_generated/api";

function ThreadItem({
  thread,
  confirm,
}: {
  thread: (typeof api.threads.get._returnType)[number];
  confirm: () => Promise<unknown>;
}) {
  const { open: isSidebarOpen } = useSidebar();
  const deleteThread = useMutation(api.threads.deleteThread);
  const updateEmoji = useMutation(api.threads.updateEmojiForThread);
  const [openEmojiPickerThreadId, setOpenEmojiPickerThreadId] = useState<
    string | null
  >(null);
  const updateTitle = useMutation(api.threads.updateTitleForThread);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isEditting, setIsEditting] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string>("");

  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const isChatPage = pathname.startsWith("/chat");
  const threadId = isChatPage ? pathname.split("/").pop() : null;

  const handleTitleCancel = () => {
    setIsEditting(false);
    setEditingTitle("");
  };

  const handleTitleSave = async () => {
    // debounce
    if (isEditting && editingTitle.trim()) {
      await updateTitle({
        threadId: thread.threadId,
        title: editingTitle.trim(),
      });
    }
    handleTitleCancel();
  };

  const handleTitleDoubleClick = (thread: Thread) => {
    setIsEditting(true);
    setEditingTitle(thread.title);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleTitleCancel();
    }
  };
  useEffect(() => {
    if (isEditting && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditting]);

  return (
    <Tooltip
      key={thread.threadId}
      delayDuration={200}
      // TODO: should not be conditionally controlled/uncontrolled
      open={isSidebarOpen ? false : undefined}
    >
      <TooltipTrigger asChild>
        <Link
          prefetch="viewport"
          to={`/chat/${thread.threadId}`}
          onClick={(e) => {
            if (threadId === thread.threadId || isEditting) {
              e.preventDefault();
            }
          }}
          className={cn(
            "rounded-md flex items-center group/thread",
            isSidebarOpen ? "px-2 py-2 " : "p-1 aspect-square justify-center h-8 w-8",
            threadId === thread.threadId
              ? "bg-primary/10 hover:bg-primary/10"
              : "hover:bg-primary/20"
          )}
        >
          <DropdownMenu
            onOpenChange={(open) => {
              // we open the emoji picker only if the sidebar is open
              if (isSidebarOpen) {
                setOpenEmojiPickerThreadId(open ? thread.threadId : null);
              }
            }}
            open={openEmojiPickerThreadId === thread.threadId}
          >
            <DropdownMenuTrigger>
              <EmojiViewer
                emoji={thread.emoji}
                className={cn(
                  !isSidebarOpen && "hover:bg-transparent p-0 w-full"
                )}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
              <EmojiPicker
                className="w-[380px] border-none"
                emojisPerRow={9}
                emojiSize={36}
                onEmojiSelect={(emoji) => {
                  updateEmoji({
                    threadId: thread.threadId,
                    emoji: emoji,
                  });
                  setOpenEmojiPickerThreadId(null);
                }}
              >
                <EmojiPicker.Header>
                  <EmojiPicker.Input
                    placeholder="Search all emoji"
                    className="h-[36px] bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 w-full rounded-[8px] text-[15px] focus:shadow-[0_0_0_1px_#1d9bd1,0_0_0_6px_rgba(29,155,209,0.3)] dark:focus:shadow-[0_0_0_1px_#1d9bd1,0_0_0_6px_rgba(29,155,209,0.3)] focus:border-transparent focus:outline-none mb-1"
                    hideIcon
                  />
                </EmojiPicker.Header>
                <EmojiPicker.Group>
                  <EmojiPicker.List containerHeight={320} />
                </EmojiPicker.Group>
                <EmojiPicker.Preview>
                  {({ previewedEmoji }) => (
                    <>
                      {previewedEmoji ? (
                        <EmojiPicker.Content />
                      ) : (
                        <button>Add Emoji</button>
                      )}
                      <EmojiPicker.SkinTone />
                    </>
                  )}
                </EmojiPicker.Preview>
              </EmojiPicker>
            </DropdownMenuContent>
          </DropdownMenu>

          {isSidebarOpen && thread.branchParentThreadId && (
            <GitBranch className="w-4 h-4 ml-1" />
          )}

          {isSidebarOpen &&
            (isEditting ? (
              <input
                id={`thread-title-${thread.threadId}`}
                ref={inputRef}
                aria-label="Thread title"
                aria-describedby="thread-title-hint"
                aria-readonly="false"
                tabIndex={-1}
                className="hover:truncate-none h-full w-full overflow-hidden rounded bg-transparent py-1 text-xs text-muted-foreground outline-none pointer-events-auto cursor-text overflow-x-auto flex-1 ml-1"
                title={thread.title}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            ) : (
              <div
                className="flex-1 text-xs truncate ml-1 cursor-pointer"
                title={thread.title}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTitleDoubleClick(thread);
                }}
              >
                {thread.title}
              </div>
            ))}

          {isSidebarOpen && (
            <button
              className="p-1 rounded-md hover:bg-primary/20 opacity-0 group-hover/thread:opacity-100 transition-opacity duration-100"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ok = await confirm();

                if (!ok) return null;

                void deleteThread({ threadId: thread._id });

                if (threadId === thread.threadId) {
                  navigate("/chat");
                }
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <p>{thread.title}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default memo(ThreadItem);
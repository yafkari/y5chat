import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, stringEmojiToImage } from "@/lib/utils";
import { MessageSquareIcon } from "lucide-react";

export default function EmojiViewer({
  emoji,
  className,
}: {
  emoji?: string;
  className?: string;
}) {
  return emoji ? (
    <div
      className={cn(
        "dark:text-zinc-400 p-1 rounded-md hover:bg-primary/20 flex items-center justify-center",
        className
      )}
    >
      <Avatar className="h-4 w-4 rounded-none">
        <AvatarImage
          className="rounded-none"
          src={stringEmojiToImage(emoji.trim())}
        />
        <AvatarFallback className="rounded-none bg-transparent">
          {emoji.trim()}
        </AvatarFallback>
      </Avatar>
    </div>
  ) : (
    <div
      className={cn(
        "dark:text-zinc-400 p-1 rounded-md hover:bg-primary/20 flex items-center justify-center",
        className
      )}
    >
      <MessageSquareIcon className="h-4 w-4 dark:text-zinc-400 focus:outline-none focus:ring-0" />
    </div>
  );
}

import { cn } from "@/lib/utils";
import { MarkdownRenderer, preprocessLaTeX } from "./markdown";

export default function MarkdownContent({
  content,
  role,
  className,
}: {
  attachmentIds: string[];
  content: string;
  role: "user" | "assistant";
  className?: string;
}) {

  return (
      <div
        className={cn(
          "w-full whitespace-pre-wrap inline-flex flex-col select-none",
          role === "assistant"
            ? "p-0 rounded-lg"
            : "px-4 py-2 bg-secondary rounded-lg w-auto justify-end"
        )}
      >
        <MarkdownRenderer content={preprocessLaTeX(content)} className={className} />
      </div>
  );
}

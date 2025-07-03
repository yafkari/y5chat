import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import MarkdownContent from "../../markdown-content";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ReasoningPart = {
  reasoning: string;
  type: "reasoning";
};

export default function ReasoningSection({
  reasoningParts,
}: {
  reasoningParts: ReasoningPart[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible defaultOpen={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-secondary/50 w-auto text-left">
        <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
        <span className="font-medium">Reasoning</span>
        <span className="text-xs opacity-60">
          ({reasoningParts.reduce((acc, part) => acc + part.reasoning.length, 0)}{" "}chars)
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="border-l-2 border-muted-foreground/20 pl-4 ml-2">
          {reasoningParts.map((part, index) => (
            <div
              key={index}
              className="text-muted-foreground/80 text-sm leading-relaxed select-none"
            >
              <MarkdownContent
                attachmentIds={[]}
                content={part.reasoning}
                role="assistant"
              />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

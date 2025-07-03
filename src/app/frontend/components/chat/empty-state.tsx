import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useState } from "react";

const defaultMessages = {
  Create: [
    "How does AI work?",
    "Are black holes real?",
    "How many Rs are in the word 'strawberry'?",
    "What is the meaning of life?",
  ],
  Explore: [
    "Good books for fans of Rick Rubin",
    "Countries ranked by number of corgis",
    "Most successful companies in the world",
    "How much does Claude cost?",
  ],
  Code: [
    "Write code to invert a binary search tree in Python",
    "What's the difference between Promise.all and Promise.allSettled?",
    "Explain React's useEffect cleanup function",
    "Best practices for error handling in async/await",
  ],
  Learn: [
    "Beginner's guide to TypeScript",
    "Explain the CAP theorem in distributed systems",
    "Why is AI so expensive?",
    "Are black holes real?",
  ],
};

export default function EmptyState({
  setInputValue,
}: {
  setInputValue: (value: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<keyof typeof defaultMessages>("Create");

  const handleQuestionClick = (question: string) => {
    setInputValue(question);
  };

  const handleCategoryClick = (category: keyof typeof defaultMessages) => {
    setSelectedCategory(category);
    // Handle category selection
  };
  return (
    <div className="w-full space-y-6 px-2 pt-[calc(max(15vh,2.5rem))] duration-300 animate-in fade-in-50 zoom-in-95 sm:px-8">
      <h2 className="text-3xl font-semibold">How can I help you?</h2>

      <div className="flex flex-row flex-wrap gap-2.5 text-sm max-sm:justify-evenly">
        {Object.keys(defaultMessages).map((category) => (
          <button
            key={category}
            onClick={() =>
              handleCategoryClick(category as keyof typeof defaultMessages)
            }
            className={cn(
              "justify-center whitespace-nowrap text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-pink-600/90 disabled:hover:bg-primary h-9 flex items-center gap-1 rounded-xl px-5 py-2 font-semibold outline-1 outline-secondary/70 backdrop-blur-xl data-[selected=false]:bg-secondary/30 data-[selected=false]:text-secondary-foreground/90 data-[selected=false]:outline data-[selected=false]:hover:bg-secondary max-sm:size-16 max-sm:flex-col sm:gap-2 sm:rounded-full",
              selectedCategory === category &&
                "bg-primary text-secondary-foreground/90 outline outline-secondary/70 hover:bg-secondary data-[selected=false]:bg-secondary data-[selected=false]:hover:bg-secondary/80"
            )}
            data-selected="false"
          >
            <Sparkles className="max-sm:block" size={16} />
            <div>{category}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col text-foreground">
        {defaultMessages[selectedCategory].map((question) => (
          <div
            key={question}
            className="flex items-start gap-2 border-t border-secondary/40 py-1 first:border-none"
          >
            <button
              onClick={() => handleQuestionClick(question)}
              className="w-full rounded-md py-2 text-left text-secondary-foreground hover:bg-secondary/50 sm:px-3"
            >
              <span>{question}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

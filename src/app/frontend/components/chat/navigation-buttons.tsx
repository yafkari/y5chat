import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export default function NavigationButtons({
  scrollContainerRef,
}: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Track scroll position to determine what button to show
  const [showNavigationButton, setShowNavigationButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isNearTop, setIsNearTop] = useState(false);
  // Constants for scroll behavior
  const SCROLL_DELTA = 100; // Show button when there's more than 100px to scroll

  // Determine if user is in the middle (neither near top nor bottom)
  const isInMiddle = !isNearBottom && !isNearTop;

  const handleGoToBottom = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop =
      scrollContainerRef.current.scrollHeight;
  };

  const handleGoToTop = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = 0;
  };

  // handle user scrolling to update button visibility and type
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    // Check if user is near bottom
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const nearBottom = distanceFromBottom < SCROLL_DELTA;
    setIsNearBottom(nearBottom);

    // Check if user is near top
    const nearTop = scrollTop < SCROLL_DELTA;
    setIsNearTop(nearTop);

    // Show navigation button if there's significant scrolling room in either direction
    const hasRoomToScroll =
      distanceFromBottom > SCROLL_DELTA || scrollTop > SCROLL_DELTA;
    setShowNavigationButton(hasRoomToScroll);
  }, [scrollContainerRef]);

  // Initialize scroll position check
  useLayoutEffect(() => {
    handleScroll();
  }, [handleScroll]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll, scrollContainerRef]);

  if (!showNavigationButton) return null;

  return (
    <div className="flex justify-center pb-4">
      {isInMiddle ? (
        <div className="flex gap-2">
          <div className="relative group">
            <Button
              onClick={handleGoToTop}
              size="sm"
              className="pointer-events-auto z-50 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-sm p-2 opacity-70 group-hover:opacity-100 rounded-full shadow-lg backdrop-blur-sm transition-[colors,opacity]"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-neutral-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Scroll to top
            </div>
          </div>
          <div className="relative group">
            <Button
              onClick={handleGoToBottom}
              size="sm"
              className="pointer-events-auto z-50 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-sm p-2 opacity-70 group-hover:opacity-100 rounded-full shadow-lg backdrop-blur-sm transition-[colors,opacity]"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-neutral-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Scroll to bottom
            </div>
          </div>
        </div>
      ) : isNearTop ? (
        <Button
          onClick={handleGoToBottom}
          size="sm"
          className="pointer-events-auto z-50 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-sm px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm transition-colors"
        >
          <ChevronDownIcon className="w-4 h-4 mr-1" />
          Scroll to bottom
        </Button>
      ) : (
        <Button
          onClick={handleGoToTop}
          size="sm"
          className="pointer-events-auto z-50 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-sm px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm transition-colors"
        >
          <ChevronUpIcon className="w-4 h-4 mr-1" />
          Scroll to top
        </Button>
      )}
    </div>
  );
}

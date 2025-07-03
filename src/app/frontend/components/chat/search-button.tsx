import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { Globe, X } from "lucide-react";
import useEphemeralSettings from "@/hooks/use-ephemeral-settings";

import UpgradeAction from "./actions/upgradeAction";

export default function SearchButton({
  isUserSubscribed,
  upgradeDropdownOpen,
  onUpgradeDropdownChange,
}: {
  isUserSubscribed: boolean | undefined;
  upgradeDropdownOpen?: boolean;
  onUpgradeDropdownChange?: (open: boolean) => void;
}) {
  const { isWebSearch, setIsWebSearch } = useEphemeralSettings();

  const buttonElement = (
    <Button
      variant="ghost"
      size="xs"
      className={cn(
        "h-8 hover:bg-primary/20 rounded-full !px-2",
        isWebSearch && "bg-primary/10"
      )}
      onClick={() => {
        if (!isUserSubscribed) return;
        setIsWebSearch(!isWebSearch);
      }}
    >
      <Globe className="w-4 h-4" />{" "}
      {isWebSearch && (
        <>
          Search <X className="w-4 h-4" />
        </>
      )}
    </Button>
  );

  if (isWebSearch) {
    return buttonElement;
  }

  if (!isUserSubscribed) {
    return (
      <UpgradeAction
        buttonElement={buttonElement}
        callToAction="Get access to web search and more features with Pro"
        open={upgradeDropdownOpen}
        onOpenChange={onUpgradeDropdownChange}
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
      <TooltipContent>Web search</TooltipContent>
    </Tooltip>
  );
}

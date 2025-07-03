import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageIcon, X } from "lucide-react";
import useEphemeralSettings from "@/hooks/use-ephemeral-settings";
import UpgradeAction from "./actions/upgradeAction";

// TODO Create an "action button" component that can be used for all the action buttons.
export default function ImageGenButton({ 
  isUserSubscribed,
  upgradeDropdownOpen,
  onUpgradeDropdownChange,
}: { 
  isUserSubscribed: boolean | undefined;
  upgradeDropdownOpen?: boolean;
  onUpgradeDropdownChange?: (open: boolean) => void;
}) {
  const { isImageGeneration, setIsImageGeneration } = useEphemeralSettings();

  const buttonElement = (
    <Button
      variant="ghost"
      size="xs"
      className={cn(
        "h-8 hover:bg-primary/20 rounded-full !px-2",
        isImageGeneration && "bg-primary/10"
      )}
      onClick={() => {
        if (!isUserSubscribed) return;
        setIsImageGeneration(!isImageGeneration);
      }}
    >
      <ImageIcon className="w-4 h-4" />{" "}
      {isImageGeneration && (
        <>
          Create Image <X className="w-4 h-4" />
        </>
      )}
    </Button>
  );

  if (isImageGeneration) {
    return buttonElement;
  }

  if (!isUserSubscribed) {
    return (
      <UpgradeAction 
        buttonElement={buttonElement} 
        callToAction="Get access to image generation and more features with Pro"
        open={upgradeDropdownOpen}
        onOpenChange={onUpgradeDropdownChange}
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
      <TooltipContent>Create Image</TooltipContent>
    </Tooltip>
  );
}

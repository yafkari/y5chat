import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function UpgradeAction({ 
  buttonElement, 
  callToAction,
  open,
  onOpenChange
}: { 
  buttonElement: React.ReactNode;
  callToAction: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const payAction = useAction(api.stripe.pay);

  const handleUpgrade = async () => {
    try {
      const url = await payAction();
      window.location.href = url;
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>{buttonElement}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Upgrade to Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {callToAction}
            </p>
            <Button 
              onClick={handleUpgrade}
              className="w-full"
              size="sm"
            >
              Upgrade now
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
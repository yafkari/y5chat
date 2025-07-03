import { X } from "lucide-react";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";

export default function UpgradeCta() {
  const user = useSessionQuery(api.users.getCurrentUser);
  const payAction = useAction(api.stripe.pay);
  const { signIn } = useAuthActions();

  const handleUpgrade = async () => {
    if (!user?._id || user?.type === "anonymous") {
      await signIn("google", {
        redirectTo: `${window.location.origin}/chat`,
      })
      return;
    }
    
    try {
      const url = await payAction();
      window.location.href = url
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };

  if (user === undefined) {
    return null;
  }

  return (
    <div className="pointer-events-auto mx-auto sm:w-1/2 md:w-2/3">
      <p className="sr-only">Upgrade to Pro</p>
      <div className="rounded-full bg-primary px-3 py-4 mb-4 text-sm text-white dark:text-black flex justify-center items-center relative select-none w-full">
        <span className="flex-1">
          You only have {user?.chatCount ? user?.chatCount : !user?._id ? 10 : 0} messages left.{" "}
          <Button variant="link" onClick={handleUpgrade} className="p-0 underline text-secondary hover:text-secondary/80">
            {!user?._id || user?.type === "anonymous" ? "Sign in to reset your limits" : "Upgrade to Pro"}
          </Button>
        </span>
        <X
          className="w-4 h-4 cursor-pointer hover:text-zinc-200 dark:hover:text-zinc-700"
          role="button"
          onClick={(e) => {
            e.currentTarget.parentElement?.parentElement?.remove();
          }}
        />
      </div>
    </div>
  );
}

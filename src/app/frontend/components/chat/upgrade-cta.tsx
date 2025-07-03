import { X } from "lucide-react";
import { Link } from "react-router";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";

export default function UpgradeCta() {
  const chatCount = useSessionQuery(api.users.getChatCount);

  if (chatCount === undefined || process.env.NODE_ENV === "development") {
    return null;
  }

  return (
    <div className="pointer-events-auto mx-auto sm:w-1/2 md:w-2/3">
      <p className="sr-only">Upgrade to Pro</p>
      <div className="rounded-3xl bg-primary px-3 py-4 mb-4 text-sm text-white dark:text-black flex justify-center items-center relative select-none w-full">
        <span className="flex-1">
          You only have {chatCount} messages left.{" "}
          <Link to="/upgrade" className="underline underline-offset-2">
            Upgrade to Pro
          </Link>
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

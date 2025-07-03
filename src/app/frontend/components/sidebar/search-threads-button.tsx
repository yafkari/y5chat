import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { Search } from "lucide-react";
import useEphemeralSettings from "@/hooks/use-ephemeral-settings";

export default function SearchThreadsButton() {
  const { threadSearchFilter, setThreadSearchFilter } = useEphemeralSettings();
  const { open } = useSidebar();

  if (!open) {
    return (
      <Button variant="ghost" className="relative data-[state=close]:hidden h-8 w-8 ml-1">
        <Search className="text-primary dark:text-white w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="relative mb-2 data-[state=close]:hidden">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary dark:text-white w-4 h-4" />
      <Input
        placeholder="Search threads..."
        value={threadSearchFilter}
        onChange={(e) => setThreadSearchFilter(e.target.value)}
        className="pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-background dark:placeholder:text-white/80 placeholder:text-primary border-primary dark:border-0"
      />
    </div>
  );
}

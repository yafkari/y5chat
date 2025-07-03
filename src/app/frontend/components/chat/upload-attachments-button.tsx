import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import UpgradeAction from "./actions/upgradeAction";

interface UploadAttachmentsButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  acceptTypes?: string; // e.g., "image/*,application/pdf"
  isUserSubscribed: boolean | undefined;
  upgradeDropdownOpen?: boolean;
  onUpgradeDropdownChange?: (open: boolean) => void;
}

export default function UploadAttachmentsButton({
  onFilesSelected,
  disabled = false,
  acceptTypes = "image/*,application/pdf",
  isUserSubscribed,
  upgradeDropdownOpen,
  onUpgradeDropdownChange,
}: UploadAttachmentsButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && fileInputRef.current && isUserSubscribed) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    }
  };

  const buttonElement = (
    <Button
        type="button"
        disabled={disabled}
        size="xs"
        variant="ghost"
        onClick={handleClick}
        className="h-8 hover:bg-primary/20 rounded-full"
        // className="pointer-events-auto hover:bg-neutral-800/60 hover:text-neutral-200 text-sm p-2 py-5 rounded-full hover:shadow-lg backdrop-blur-sm transition-[colors,opacity] disabled:opacity-30"
      >
        <Paperclip className="size-5" />
      </Button>
  )

  if (!isUserSubscribed) {
    return (
      <UpgradeAction 
        buttonElement={buttonElement} 
        callToAction="Get access to uploading attachments and more features with Pro"
        open={upgradeDropdownOpen}
        onOpenChange={onUpgradeDropdownChange}
      />
    );
  }

  return (
    <>
      {buttonElement}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptTypes}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}

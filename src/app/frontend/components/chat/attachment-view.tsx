import { Attachment } from "@/convex/schema";
import { FileIcon } from "lucide-react";
import Image from "next/image";
import { useImageDialog } from "@/hooks/use-image-dialog";
import { useAuthToken } from "@convex-dev/auth/react";

export default function AttachmentView({
  attachment,
  ...props
}: {
  attachment: Partial<Attachment> & { signedUrl: string };
}) {
  const { openDialog, ImageDialog } = useImageDialog(true, true, attachment.fileKey);
  const token = useAuthToken();

  const handleDownload = async () => {
    if (!attachment.fileKey) return;
    
    try {
      // Get signed download URL from API
      const response = await fetch(`/api/attachments/${encodeURIComponent(attachment.fileKey)}/download-url?filename=${encodeURIComponent(attachment.filename || "file")}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }
      
      const { downloadUrl } = await response.json();
      
      // Trigger download with signed URL
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = attachment.filename || "file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download attachment:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  if (attachment.mimeType?.startsWith("image/")) {
    return (
      <>
        {ImageDialog}
        <Image
          onClick={() => openDialog(attachment.signedUrl, attachment.filename)}
          className="max-w-full object-cover object-center overflow-hidden rounded-lg h-full max-h-96 w-fit transition-opacity duration-300 opacity-100 cursor-pointer hover:opacity-80"
          src={attachment.signedUrl}
          alt="Attachment"
          width={100}
          height={100}
          unoptimized
          {...props}
        />
      </>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDownload();
      }}
      className="flex items-center justify-center p-2 w-80 border border-gray-200 dark:border-primary/30 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors duration-100"
      {...props}
    >
      <div className="flex flex-row items-center gap-2 w-full">
        <div className="flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-primary/30 rounded-lg">
          <FileIcon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium">{attachment.filename}</p>
          <p className="text-xs text-gray-500 dark:text-gray-200 text-ellipsis overflow-hidden">
            {attachment.mimeType?.split("/")?.at(1)?.toLocaleUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}

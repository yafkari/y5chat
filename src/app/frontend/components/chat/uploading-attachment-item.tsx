import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useAuthToken } from "@convex-dev/auth/react";

export type InMemoryAttachment = {
  file: File;
  preview: string;
  uploading: boolean;
  fileKey?: string;
};

const UploadingAttachmentItem = ({
  attachment,
  removeAttachment,
  onUploadComplete,
}: {
  attachment: InMemoryAttachment;
  removeAttachment: (name: string) => void;
  onUploadComplete: (name: string, fileKey: string) => void;
}) => {
  const token = useAuthToken();
  const [isUploading, setIsUploading] = useState(attachment.uploading);
  const uploadStartedRef = useRef(false);

  useEffect(() => {
    const uploadFile = async () => {
      // Prevent multiple uploads of the same file
      if (isUploading && !attachment.fileKey && !uploadStartedRef.current) {
        uploadStartedRef.current = true;

        try {
          // Get signed URL for upload
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
              "x-convex-session-id":
                localStorage.getItem("convex-session-id") || "",
            },
            body: JSON.stringify({
              fileType: attachment.file.type,
              fileSize: attachment.file.size,
              isTemp: true,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to get upload URL");
          }

          const { presignedUrl, fileKey } = await response.json();

          // Upload file to S3
          const uploadResponse = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": attachment.file.type,
            },
            body: attachment.file,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload file");
          }

          onUploadComplete(attachment.file.name, fileKey);
          setIsUploading(false);
        } catch (error) {
          console.error("Error uploading file:", error);
          setIsUploading(false);
          uploadStartedRef.current = false; // Reset on error to allow retry
        }
      }
    };

    uploadFile();
  }, [
    attachment.file,
    isUploading,
    attachment.fileKey,
    token,
    onUploadComplete,
  ]);

  return (
    <div className="relative">
      {attachment.file.type.startsWith("image/") ? (
        <Image
          src={attachment.preview}
          alt={attachment.file.name}
          className="h-12 w-12 object-cover rounded-lg border border-border"
          width={48}
          height={48}
        />
      ) : (
        <div className="h-12 w-20 bg-secondary flex items-center justify-center rounded-lg border border-border">
          <p
            className="text-xs text-center overflow-hidden p-1 truncate text-foreground"
            title={attachment.file.name}
          >
            {attachment.file.name.split(".").pop()?.toUpperCase()}
          </p>
        </div>
      )}
      <button
        onClick={() => removeAttachment(attachment.file.name)}
        className="absolute -top-2 -right-2 z-10 rounded-full p-1 bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
      >
        <X size={12} />
      </button>
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default UploadingAttachmentItem;

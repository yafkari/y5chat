import { useState, useEffect } from "react";
import { useAuthToken } from "@convex-dev/auth/react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useImageDialog } from "@/hooks/use-image-dialog";
import { cn } from "@/lib/utils";

interface GeneratedImageDisplayProps {
  imagePart: {
    image?: string; // Now optional (will be removed from existing rows)
    fileKey?: string;
    alt?: string; // Alt text (prompt used for generation)
    isLoading?: boolean; // Loading state flag
  };
}

export default function GeneratedImageDisplay({
  imagePart,
}: GeneratedImageDisplayProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const token = useAuthToken();
  const { openDialog, ImageDialog } = useImageDialog(true, true, imagePart.fileKey);

  useEffect(() => {
    // If this is a loading placeholder, don't try to fetch URL
    if (imagePart.isLoading) {
      return;
    }

    // For persisted images, the fileKey field contains the key, or fallback to image field
    const fileKey = imagePart.fileKey || imagePart.image;

    if (!fileKey) {
      setError(true);
      return;
    }

    // Fetch signed URL for persisted images
    const fetchSignedUrl = async () => {
      try {
        const response = await fetch(
          `/api/generated-images/${encodeURIComponent(fileKey)}/url`,
          {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch signed URL: ${response.status}`);
        }

        const { signedUrl } = await response.json();
        setSignedUrl(signedUrl);
      } catch (error) {
        console.error("Error fetching signed URL for generated image:", error);
        setError(true);
      }
    };

    fetchSignedUrl();
  }, [imagePart.fileKey, imagePart.image, imagePart.isLoading, token]);

  if (error) {
    return (
      <div className="w-1/2 rounded-lg bg-gray-200 p-4 text-center">
        <p className="text-sm text-gray-500">Failed to load image</p>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="w-1/2 aspect-square rounded-lg bg-gray-100 dark:bg-neutral-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner />
          </div>
        </div>
      )}
      {signedUrl && (
        <img
          className={cn(
            "w-1/2 h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity",
            isLoading && "hidden"
          )}
          src={signedUrl}
          onClick={() => openDialog(signedUrl || "", imagePart.alt || "")}
          alt={imagePart.alt || "Generated Image"}
          onError={() => {
            if (!error) {
              setError(true);
              setIsLoading(false);
            }
          }}
          onLoad={() => setIsLoading(false)}
        />
      )}
      {ImageDialog}
    </>
  );
}

"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { DownloadIcon } from "lucide-react";
import { useAuthToken } from "@convex-dev/auth/react";

const imageStyle = {
  display: "block",
  marginBottom: "-1px",
  marginRight: "-1px",
};

export function useImageDialog(
  showAlt = true,
  canDownload = true,
  fileKey?: string
) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgAlt, setImgAlt] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const token = useAuthToken();

  const openDialog = useCallback((src: string, alt = "") => {
    setImgSrc(src);
    setImgAlt(alt);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setImgSrc(null);
    setImgAlt("");
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDialog]);

  const handleDownload = async () => {
    if (!imgSrc || isDownloading) return;
    
    setIsDownloading(true);
    try {
      let downloadUrl: string;
      // TODO cleanup this sht.

      // Check if this is a generated image (contains generated-images in the URL)
      if (imgSrc.includes("generated-images/") && fileKey) {
          // Get signed download URL from API
          const response = await fetch(`/api/generated-images/${encodeURIComponent(fileKey)}/download-url?filename=${encodeURIComponent(imgAlt)}`, {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          
          if (!response.ok) {
            throw new Error("Failed to get download URL");
          }
          
          const { downloadUrl: signedUrl } = await response.json();
          downloadUrl = signedUrl;
       
      } else if (fileKey) {
        // For regular attachments
        const response = await fetch(`/api/attachments/${encodeURIComponent(fileKey)}/download-url?filename=${encodeURIComponent(imgAlt)}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to get download URL");
        }
        
        const { downloadUrl: signedUrl } = await response.json();
        downloadUrl = signedUrl;
      } else {
        // Fallback for other images - try direct download
        const response = await fetch(imgSrc);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        downloadUrl = url;
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = imgAlt || "image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL if it was created
      if (downloadUrl.startsWith("blob:")) {
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error("Failed to download image:", error);
      // Show user-friendly error message
      alert("Failed to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const ImageDialog = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeDialog}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center justify-center overflow-hidden bg-transparent rounded-lg gap-2">
            <div className="max-h-[75vh] max-w-[80vw] relative">
              {canDownload && !isLoading && (
                <div className="absolute top-2 right-2 z-10">
                  <button
                    className={`text-white bg-black hover:bg-zinc-900 transition-colors duration-200 px-1 py-1 rounded-md ${
                      isDownloading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    <DownloadIcon className={`w-6 h-6 p-1 ${isDownloading ? "animate-pulse" : ""}`} />
                  </button>
                </div>
              )}
              <img
                src={imgSrc || ""}
                alt={imgAlt}
                className="block max-h-[75vh] max-w-[80vw] object-contain border-none outline-none m-0 rounded-lg"
                style={imageStyle}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            </div>
            {showAlt && !isLoading && (
              <span className="text-white text-sm w-1/2 text-center">
                {imgAlt}
              </span>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return { openDialog, ImageDialog };
}

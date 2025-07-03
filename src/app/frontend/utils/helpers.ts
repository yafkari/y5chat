import { Dispatch, SetStateAction } from "react";
import { StreamParser } from "./stream-parser";
import { InitialText } from "@/app/backend/generate-chat-stream";

export const handleStreamingResponse = async (
  response: Response,
  responseMessageId: string,
  setStreamingContent: Dispatch<SetStateAction<{
    messageId: string;
    content: string;
    reasoning: string;
    streamingImages: { base64: string; fileKey: string; alt: string }[];
  } | null>>,
  abortController?: AbortController
) => {
  // Initialize streaming content
  setStreamingContent({
    messageId: responseMessageId,
    content: "",
    reasoning: "",
    streamingImages: [],
  });

  const streamParser = new StreamParser();
  
  try {
    await streamParser.parseStreamResponse(response, (update) => {
      // Check if the request was aborted
      if (abortController?.signal.aborted) {
        return;
      }

      switch (update.type) {
        case 'text-delta':
          setStreamingContent((prev) => {
            if (!prev || abortController?.signal.aborted) return null;
            
            const newContent = prev.content + (update.textDelta || "");
            const updatedContent = {
              ...prev,
              content: newContent,
            };
            
            // If we see "Image Generation" text, add a loading placeholder if not already present
            if (newContent.includes(InitialText) && 
                !prev.streamingImages.some(img => img.base64 === "loading")) {

              updatedContent.streamingImages = [...prev.streamingImages, {
                base64: "loading",
                fileKey: "loading-text-based",
                alt: "Generating image..."
              }];
            }
            
            return updatedContent;
          });
          break;
        case 'reasoning-delta':
          setStreamingContent((prev) =>
            (prev && !abortController?.signal.aborted)
              ? {
                  ...prev,
                  reasoning: prev.reasoning + (update.textDelta || ""),
                }
              : null
          );
          break;
        case 'generated-image-loading':
          setStreamingContent((prev) => {
            if (abortController?.signal.aborted) return null;
            const newContent = prev && update.loadingImage
              ? {
                  ...prev,
                  streamingImages: [...prev.streamingImages, { 
                    base64: "loading", // Use "loading" as a special marker
                    fileKey: update.loadingImage.fileKey,
                    alt: update.loadingImage.alt 
                  }],
                }
              : null;
            return newContent;
          });
          break;
        case 'generated-image-stream':
          setStreamingContent((prev) => {
            if (!prev || !update.generatedImage || abortController?.signal.aborted) return prev;
            
            // Find and replace the loading placeholder with the actual image
            // Try to match by toolCallId first, then by loading marker, then by text-based loading
            let existingIndex = -1;
            if (update.generatedImage.toolCallId) {
              existingIndex = prev.streamingImages.findIndex(img => img.fileKey === `loading-${update.generatedImage!.toolCallId}`);
            }
            if (existingIndex === -1) {
              existingIndex = prev.streamingImages.findIndex(img => img.base64 === "loading");
            }
            
            if (existingIndex !== -1) {
              // Replace the loading placeholder
              const updatedImages = [...prev.streamingImages];
              updatedImages[existingIndex] = {
                base64: update.generatedImage.base64,
                fileKey: update.generatedImage.fileKey,
                alt: update.generatedImage.alt
              };
              return {
                ...prev,
                streamingImages: updatedImages,
              };
            } else {
              // Add as new image if no placeholder found
              return {
                ...prev,
                streamingImages: [...prev.streamingImages, {
                  base64: update.generatedImage.base64,
                  fileKey: update.generatedImage.fileKey,
                  alt: update.generatedImage.alt
                }],
              };
            }
          });
          break;
        case 'tool-call':
          // Tool calls will be handled by the backend and reflected in the database
          break;
        case 'source':
          break;
        case 'tool-result':
          // Tool results (like generated images) will be handled by the backend
          break;
        case 'file':
          break;
        case 'error':
          console.error("Stream error:", update.error);
          break;
        case 'finish':
          // Stream finished - streaming content will be cleared by the chat component
          // when it detects the database message has been synchronized
          break;
        default:
          break;
      }
    }, abortController);
  } catch (error) {
    // If the error is due to abort, handle it gracefully
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Stream was cancelled by user');
      return;
    }
    throw error; // Re-throw other errors
  }
};
import ModelSelector from "./chat/model-selector";
import SearchButton from "./chat/search-button";
import UploadAttachmentsButton from "./chat/upload-attachments-button";
import {
  FormEvent,
  useState,
  useCallback,
  SetStateAction,
  Dispatch,
  useRef,
} from "react";
import UpgradeCta from "./chat/upgrade-cta";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { useNavigate } from "react-router";
import { useAuthToken } from "@convex-dev/auth/react";
import { generateUUID } from "@/lib/utils";
import TextareaAutosize from "react-textarea-autosize";
import NavigationButtons from "./chat/navigation-buttons";
import { useDropzone } from "react-dropzone";
import UploadingAttachmentItem, {
  InMemoryAttachment,
} from "./chat/uploading-attachment-item";
import { FilePart, ImagePart } from "ai";
import { handleStreamingResponse } from "../utils/helpers";
import useEphemeralSettings from "@/hooks/use-ephemeral-settings";
import { modelSupportsFeature } from "@/app/backend/lib/models";
import ImageGenButton from "./chat/image-gen-button";
import { toast } from "sonner";

export default function ChatInputWrapper({
  threadId,
  chatInputWrapperRef,
  chatInputRef,
  scrollContainerRef,
  setStreamingContent,
  captchaToken,
  onCallback,
  streamingContent,
  handleStopStreaming,
}: {
  threadId: string | undefined;
  chatInputWrapperRef: React.RefObject<HTMLDivElement | null>;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setStreamingContent: Dispatch<
    SetStateAction<{
      messageId: string;
      content: string;
      reasoning: string;
      streamingImages: { base64: string; fileKey: string; alt: string }[];
    } | null>
  >;
  captchaToken: string | undefined;
  onCallback: () => void;
  streamingContent: {
    messageId: string;
    content: string;
    reasoning: string;
    streamingImages: { base64: string; fileKey: string; alt: string }[];
  } | null;
  handleStopStreaming: () => void;
}) {
  const isUserSubscribed = useSessionQuery(api.users.isUserSubscribed);
  const token = useAuthToken();
  const navigate = useNavigate();
  const {
    isWebSearch,
    isImageGeneration,
    openUpgradeDropdown,
    setOpenUpgradeDropdown,
  } = useEphemeralSettings();
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<InMemoryAttachment[]>([]);
  const selectedModel = useSessionQuery(api.userPreferences.getSelectedModel);

  // Add abort controller ref for stopping streams
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to stop streaming
  const handleStop = useCallback(() => {
    handleStopStreaming();
    if (abortControllerRef.current) {
      console.log("aborting");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamingContent(null);
    }
  }, [setStreamingContent, handleStopStreaming]);

  // Determine if any streaming is happening (initial request or streaming content)
  const isAnyStreaming = isStreaming || streamingContent !== null;

  // Check if the selected model supports various features
  const supportsWebSearch = selectedModel
    ? modelSupportsFeature(selectedModel, "webSearch")
    : false;
  const supportsImageUpload = selectedModel
    ? modelSupportsFeature(selectedModel, "imageUpload")
    : false;
  const supportsPdfUpload = selectedModel
    ? modelSupportsFeature(selectedModel, "pdfUpload")
    : false;
  const supportsAnyUpload = supportsImageUpload || supportsPdfUpload;
  const supportsImageGeneration = selectedModel
    ? modelSupportsFeature(selectedModel, "imageGeneration")
    : false;

  // Get current messages for the thread (skip query if no threadId to avoid session errors)
  const messages = useSessionQuery(
    api.messages.getByThreadId,
    threadId ? { threadId } : "skip"
  );

  // Helper function to move temp file to permanent location
  const moveFileToFinal = async (
    fileKey: string
  ): Promise<{ key: string; url: string }> => {
    const response = await fetch("/api/move-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ fileKey }),
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error(response.statusText);
      } else if (response.status === 401) {
        throw new Error(response.statusText);
      } else if (response.status === 400) {
        throw new Error(response.statusText);
      } else {
        throw new Error("Failed to move file to final location");
      }
    }

    const { key, imageUrl } = await response.json();
    return { key, url: imageUrl };
  };

  // Attachment handling functions
  const handleFilesAdded = (files: File[]) => {
    if (attachments.length + files.length > 20) {
      console.error("Maximum 20 attachments allowed");
      return;
    }

    const newFiles = files
      .filter((file) => file.size <= 20 * 1024 * 1024) // 20MB limit
      .filter((file) => {
        // Filter based on model capabilities
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";

        return (isImage && supportsImageUpload) || (isPdf && supportsPdfUpload);
      })
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        uploading: true,
      }));

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = useCallback((name: string) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      const index = newAttachments.findIndex((a) => a.file.name === name);
      if (index !== -1) {
        URL.revokeObjectURL(newAttachments[index].preview);
        newAttachments.splice(index, 1);
      }
      return newAttachments;
    });
  }, []);

  const handleUploadComplete = useCallback(
    (fileName: string, fileKey: string) => {
      setAttachments((prev) => {
        return prev.map((attachment) => {
          if (attachment.file.name === fileName) {
            return { ...attachment, uploading: false, fileKey };
          }
          return attachment;
        });
      });
    },
    []
  );

  // Configure dropzone based on model capabilities
  const acceptedTypes: Record<string, string[]> = {};
  if (supportsImageUpload) {
    acceptedTypes["image/*"] = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  }
  if (supportsPdfUpload) {
    acceptedTypes["application/pdf"] = [".pdf"];
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesAdded,
    accept: acceptedTypes,
    maxFiles: 20,
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
    noClick: true, // We'll handle clicks separately
    disabled: !supportsAnyUpload || !isUserSubscribed, // Disable if model doesn't support uploads
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = chatInputRef.current?.value || "";
    const hasUploadingAttachments = attachments.some(
      (attachment) => attachment.uploading
    );
    if (
      (!text?.trim() && attachments.length === 0) ||
      isAnyStreaming ||
      hasUploadingAttachments
    ) {
      return;
    }

    // Generate IDs
    const userMessageId = generateUUID();
    const responseMessageId = generateUUID();
    const streamId = generateUUID();
    const currentThreadId = threadId ?? generateUUID();

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Clear input immediately using ref
    if (chatInputRef.current) {
      chatInputRef.current.value = "";
    }

    setIsStreaming(true);

    try {
      // Process attachments if any
      const uploadedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.fileKey) {
            // File was already uploaded to temp storage
            const { key: finalKey } = await moveFileToFinal(attachment.fileKey);

            return {
              id: finalKey,
              name: attachment.file.name,
              type: attachment.file.type,
              fileKey: attachment.fileKey,
            };
          }
          return null;
        })
      );

      const validAttachments = uploadedAttachments.filter(
        (attachment) => attachment !== null
      );

      // Convert current messages to AI SDK format
      const aiSdkMessages =
        messages?.map((msg) => ({
          id: msg.messageId,
          role: msg.role,
          parts: msg.parts,
          attachments: [],
        })) || [];

      const imageParts: ImagePart[] = validAttachments
        .filter((attachment) => attachment.type.startsWith("image/"))
        .map((attachment) => ({
          type: "image",
          image: attachment.fileKey,
          mimeType: attachment.type,
        }));

      const fileParts: FilePart[] = validAttachments
        .filter((attachment) => attachment.type.startsWith("application/pdf"))
        .map((attachment) => ({
          type: "file",
          data: attachment.fileKey,
          mimeType: attachment.type,
          filename: attachment.name,
        }));

      // Add the new user message
      const newUserMessage = {
        id: userMessageId,
        role: "user" as const,
        parts: [
          { type: "text", text: text?.trim() || "" },
          ...imageParts,
          ...fileParts,
        ],
        attachments: validAttachments, // TODO can use parts instead now.
      };

      const allMessages = [...aiSdkMessages, newUserMessage];

      const requestParams = JSON.stringify({
        messages: allMessages,
        threadMetadata: {
          threadId: currentThreadId,
        },
        responseMessageId,
        streamId,
        model: selectedModel,
        convexSessionId: localStorage.getItem("convex-session-id"),
        modelParams: {
          reasoningEffort: "medium" as const,
          includeSearch: isWebSearch && supportsWebSearch,
          includeImageGeneration: isImageGeneration && supportsImageGeneration,
        },
        userInfo: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          languages: navigator.languages,
        },
        captchaToken: captchaToken || undefined,
      });

      // Make the streaming request
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: requestParams,
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("You need to be logged in to send messages");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      navigate(`/chat/${currentThreadId}`);

      await handleStreamingResponse(
        response,
        responseMessageId,
        setStreamingContent,
        abortControllerRef.current
      );

      // Note: Don't set isStreaming(false) here - let it be controlled by streamingContent state
      // The button will switch back to send mode when streamingContent becomes null
      setAttachments([]);
    } catch (error: unknown) {
      // Handle abort error gracefully
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was cancelled by user");
        return; // Don't show error toast for user-initiated cancellation
      }
      console.error("Error sending message:", error);
      setIsStreaming(false);
      toast.error(
        error instanceof Error ? error.message : "Error sending message"
      );
    } finally {
      // Clean up abort controller
      abortControllerRef.current = null;
      onCallback();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
    }
  };

  const handleUpgradeDropdownChange = (dropdownId: string, open: boolean) => {
    if (open) {
      setOpenUpgradeDropdown(dropdownId);
    } else {
      setOpenUpgradeDropdown(null);
    }
  };

  // useEffect(() => {
  //   if (streamingContent === null) {
  //     setIsStreaming(false);
  //   }
  // }, [streamingContent]);

  return (
    <div
      ref={chatInputWrapperRef}
      className="pointer-events-none absolute bottom-0 z-10 w-full px-2"
    >
      <div className="relative mx-auto flex w-full max-w-3xl flex-col text-center">
        <div className="pointer-events-none">
          <NavigationButtons scrollContainerRef={scrollContainerRef} />
          <UpgradeCta />
          <div
            className={`pointer-events-auto z-50 rounded-3xl bg-secondary p-2 pb-1 border-2 mb-4 transition-colors ${
              isDragActive && supportsAnyUpload
                ? "border-primary bg-primary/5"
                : "border-primary/50"
            }`}
            {...(supportsAnyUpload ? getRootProps() : {})}
          >
            <input {...getInputProps()} />

            <form
              className="relative flex w-full flex-col items-stretch gap-2 rounded-xl px-2 pt-1 text-secondary-foreground outline outline-secondary sm:max-w-3xl"
              onSubmit={handleSubmit}
            >
              {isDragActive && supportsAnyUpload && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm mb-1">
                  <p className="text-primary font-medium">
                    Drop{" "}
                    {supportsImageUpload && supportsPdfUpload
                      ? "images or PDFs"
                      : supportsImageUpload
                      ? "images"
                      : "PDFs"}{" "}
                    here...
                  </p>
                </div>
              )}
              <div className="flex flex-grow flex-col">
                <div id="attachments">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 px-2">
                      {attachments.map((attachment) => (
                        <UploadingAttachmentItem
                          key={attachment.file.name}
                          attachment={attachment}
                          removeAttachment={removeAttachment}
                          onUploadComplete={handleUploadComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-grow flex-row items-start">
                  <TextareaAutosize
                    autoFocus
                    ref={chatInputRef}
                    onKeyDown={handleKeyDown}
                    name="chat-input"
                    id="chat-input"
                    placeholder={
                      isAnyStreaming
                        ? "AI is responding..."
                        : attachments.some((a) => a.uploading)
                        ? "Uploading files..."
                        : !supportsAnyUpload && !supportsWebSearch
                        ? "Send a message (text only)..."
                        : "Send a message..."
                    }
                    disabled={isAnyStreaming}
                    maxRows={10}
                    minRows={1}
                    className="w-full resize-none bg-transparent text-base leading-6 text-foreground outline-none placeholder:text-secondary-foreground/60 disabled:opacity-50"
                  />
                  <div id="chat-input-description" className="sr-only">
                    Press Enter to send, Shift + Enter for new line
                  </div>
                </div>
                <div className="-mb-px mt-2 flex w-full justify-between items-center">
                  <div className="flex items-center gap-1">
                    <ModelSelector chatInputRef={chatInputRef} />
                    {supportsWebSearch && (
                      <SearchButton
                        isUserSubscribed={isUserSubscribed}
                        upgradeDropdownOpen={openUpgradeDropdown === "search"}
                        onUpgradeDropdownChange={(open) =>
                          handleUpgradeDropdownChange("search", open)
                        }
                      />
                    )}
                    {supportsImageGeneration && (
                      <ImageGenButton
                        isUserSubscribed={isUserSubscribed}
                        upgradeDropdownOpen={
                          openUpgradeDropdown === "image-gen"
                        }
                        onUpgradeDropdownChange={(open) =>
                          handleUpgradeDropdownChange("image-gen", open)
                        }
                      />
                    )}
                    {supportsAnyUpload && (
                      <UploadAttachmentsButton
                        onFilesSelected={handleFilesAdded}
                        disabled={isAnyStreaming}
                        acceptTypes={Object.keys(acceptedTypes).join(",")}
                        isUserSubscribed={isUserSubscribed}
                        upgradeDropdownOpen={openUpgradeDropdown === "upload"}
                        onUpgradeDropdownChange={(open) =>
                          handleUpgradeDropdownChange("upload", open)
                        }
                      />
                    )}
                  </div>
                  <div className="flex gap-1 mb-2">
                    {isAnyStreaming ? (
                      <Button
                        type="button"
                        onClick={handleStop}
                        size="xs"
                        className="pointer-events-auto z-50 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-sm !px-2.5 mb-0.5 -mr-1 py-5 rounded-full shadow-lg backdrop-blur-sm transition-[colors,opacity] disabled:opacity-30"
                      >
                        <Square className="size-5" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={attachments.some((a) => a.uploading)}
                        size="xs"
                        className="pointer-events-auto z-50 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-sm !px-2.5 mb-0.5 -mr-1 py-5 rounded-full shadow-lg backdrop-blur-sm transition-[colors,opacity] disabled:opacity-30"
                      >
                        <ArrowUp className="size-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

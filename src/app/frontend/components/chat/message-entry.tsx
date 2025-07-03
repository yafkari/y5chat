import React from "react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Copy, Check, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MarkdownContent from "../markdown-content";
import { Message } from "@/convex/schema";
import ModelActionDropdown from "./model-action-dropdown";
import TextareaAutosize from "react-textarea-autosize";
import { AI_MODELS, AI_MODELS_NAMES } from "@/app/backend/lib/models";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuthToken } from "@convex-dev/auth/react";
import AttachmentView from "./attachment-view";
import { Link } from "react-router";
import GeneratedImageDisplay from "./generated-image-display";
import ReasoningSection from "./message-entry/reasoning-section";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useIsMobile } from "@/hooks/use-mobile";

type MessageEntryProps = Message & {
  onRegenerate?: (modelId?: string) => void;
  onBranch?: (modelId?: string) => void;
  onEdit?: (newText: string) => void;
  streamingImages?: { base64: string; fileKey: string; alt: string }[];
};

export default React.memo(function MessageEntry({
  message,
  onRegenerate,
  onBranch,
  onEdit,
  streamingImages,
}: {
  message: MessageEntryProps;
  onRegenerate?: (modelId?: string) => void;
  onBranch?: (modelId?: string) => void;
  onEdit?: (newText: string) => void;
  streamingImages?: { base64: string; fileKey: string; alt: string }[];
}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isBranching, setIsBranching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const [attachmentUrls, setAttachmentUrls] = useState<
    { id: string; signedUrl: string }[]
  >([]);
  const attachmentFiles = useSessionQuery(api.attachments.getFiles, {
    ids: message.attachmentIds as Id<"attachments">[],
  });
  const token = useAuthToken();

  useEffect(() => {
    const fetchAttachmentUrls = async () => {
      if (!attachmentFiles || attachmentFiles.length === 0) {
        setAttachmentUrls([]);
        return;
      }

      try {
        const urls = await Promise.all(
          attachmentFiles.map(async (attachment) => {
            const response = await fetch(
              `/api/attachments/${attachment.fileKey}/url`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            // TODO: try because can throw.
            const { signedUrl } = await response.json();

            return {
              id: attachment.id,
              signedUrl,
            };
          })
        );
        setAttachmentUrls(urls);
      } catch (error) {
        console.error("Failed to fetch attachment URLs:", error);
        console.log(error);
        // Fallback to simple URLs if signed URL generation fails
      }
    };

    fetchAttachmentUrls();
  }, [attachmentFiles, token]);

  // const contentLength = message.parts.reduce(
  //   (acc, part) =>
  //     acc +
  //     (part.type === "text"
  //       ? part.text.length
  //       : part.type === "reasoning"
  //       ? part.reasoning.length
  //       : 0),
  //   0
  // );

  // Separate text and reasoning parts
  const textParts = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  );

  const sources = message.parts.filter((part) => part.type === "source");

  const handleRegenerate = async (modelId?: string) => {
    if (!onRegenerate || isRegenerating) return;

    setIsRegenerating(true);
    try {
      await onRegenerate(modelId ?? message.model);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleBranch = async (modelId?: string) => {
    if (!onBranch || isBranching) return;

    setIsBranching(true);
    try {
      await onBranch(modelId);
    } finally {
      setIsBranching(false);
    }
  };

  const handleEdit = () => {
    setEditValue(textParts); // Only edit text parts, not reasoning
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEdit && editValue.trim() !== textParts) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleCopy = async () => {
    try {
      // Copy both text and reasoning, but format reasoning clearly
      let copyText = textParts;
      if (reasoningParts?.some((part) => part.reasoning.length > 0)) {
        const reasoningText = reasoningParts
          .map((part) => part.reasoning)
          .join("\n\n");
        copyText += `\n\n--- Reasoning ---\n${reasoningText}`;
      }

      await navigator.clipboard.writeText(copyText.trim());
      setIsCopied(true);
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // TODO: use intersection observer to replace the actions with empty divs when the message is not in view
  return (
    <div
      data-testid={`message-entry-${message.messageId}`}
      className={cn(
        "flex relative w-full group",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative flex flex-col",
          message.role === "assistant" ? "w-full" : "max-w-[80%]",
          message.role === "user" ? "items-end" : "items-start"
        )}
      >
        {attachmentUrls?.map((attachment) => (
          <div
            key={attachment.id}
            className="overflow-hidden rounded-lg h-full max-w-96 max-h-64 mb-2"
          >
            <AttachmentView
              key={`${attachment.id}-${attachment.signedUrl}`}
              attachment={{
                ...attachmentFiles?.find((a) => a.id === attachment.id),
                signedUrl: attachment.signedUrl,
              }}
            />
          </div>
        ))}

        {isEditing ? (
          <div className="w-full">
            <TextareaAutosize
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              maxRows={10}
              minRows={1}
              className="w-full resize-none bg-secondary/20 border border-secondary/40 rounded-md p-3 text-base leading-6 text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
              placeholder="Edit your message..."
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleCancelEdit}
                size="sm"
                variant="ghost"
                className="h-8 px-3"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                size="sm"
                variant="default"
                className="h-8 px-3"
                disabled={!editValue.trim() || editValue.trim() === textParts}
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "w-full",
              message.role === "user" && "flex justify-end"
            )}
          >
            {/* Reasoning Section - Only show for assistant messages with reasoning */}
            {message.role === "assistant" &&
              reasoningParts.some((part) => part.reasoning.length > 0) && (
                <ReasoningSection reasoningParts={reasoningParts} />
              )}

            {/* Main Content */}
            {textParts && (
              <MarkdownContent
                attachmentIds={message.attachmentIds ?? []}
                content={textParts}
                role={message.role as "user" | "assistant"}
                className={message.role === "user" ? "pl-0" : ""}
              />
            )}

            {/* Generated Images - show both persisted and streaming images */}
            {message.role === "assistant" &&
              (message.parts.some((part) => part.type === "generated-image") ||
                (streamingImages && streamingImages.length > 0)) && (
                <div className="flex flex-col gap-2 mt-4">
                  {/* Persisted images from database */}
                  {message.parts
                    .filter((part) => part.type === "generated-image")
                    .map((part, index) => {
                      return (
                        <GeneratedImageDisplay
                          key={`persisted-${index}`}
                          imagePart={part}
                        />
                      );
                    })}

                  {/* Streaming images (immediate display with base64) */}
                  {streamingImages?.map((streamingImage, index) => {
                    if (streamingImage.base64 === "loading") {
                      return (
                        <div
                          key={`streaming-${index}`}
                          className="w-1/2 rounded-lg bg-muted flex items-center justify-center aspect-square animate-pulse"
                        >
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <LoadingSpinner />
                            <span className="text-sm">
                              {streamingImage.alt}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <img
                        key={`streaming-${index}`}
                        className="w-1/2 rounded-lg"
                        src={`data:image/png;base64,${streamingImage.base64}`}
                        alt={streamingImage.alt}
                      />
                    );
                  })}
                </div>
              )}

            {message.role === "assistant" && sources.length > 0 && (
              <>
                <div className="text-base font-medium pt-2 pb-1">Sources:</div>
                <Carousel
                  opts={{
                    watchDrag: false,
                  }}
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {sources.map((source) => (
                      <CarouselItem
                        key={source.source.id}
                        className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 cursor-pointer select-none"
                      >
                        <Link
                          to={source.source.url}
                          target="_blank"
                          className="block h-full"
                        >
                          <Card className="h-full flex flex-col pt-3 pb-2 bg-secondary/70 hover:bg-secondary/30 transition-colors">
                            <CardContent className="flex flex-col gap-2 px-4 py-0 h-full flex-1 justify-between">
                              <div className="text-sm font-medium">
                                {source.source.title}
                              </div>
                              <p className="text-sm text-blue-500 underline cursor-pointer truncate">
                                {source.source.url}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {sources.length > 3 && (
                    <>
                      <CarouselPrevious />
                      <CarouselNext />
                    </>
                  )}
                </Carousel>
              </>
            )}
          </div>
        )}

        {/* Actions - don't show when editing */}
        {!isEditing && (
          <div
            className={cn(
              "flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100 z-10 mt-2",
              message.role === "user" ? "justify-end" : "justify-start",
              isDropdownOpen && "opacity-100",
              isMobile && "opacity-100"
            )}
          >
            {/* User message actions */}
            {message.role === "user" && (
              <>
                {onEdit && (
                  <Button
                    onClick={handleEdit}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-1"
                    title="Edit message"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onRegenerate && (
                  <ModelActionDropdown
                    actionType="regenerate"
                    currentModelId={message.model}
                    onAction={handleRegenerate}
                    isLoading={isRegenerating}
                    onOpenChange={setIsDropdownOpen}
                    hasImages={
                      message.attachmentIds && message.attachmentIds.length > 0
                    }
                  />
                )}
              </>
            )}

            {/* Assistant message actions */}
            {message.role === "assistant" && (
              <>
                {/* Branch dropdown - creates new thread with alternative response */}
                {onBranch && (
                  <ModelActionDropdown
                    actionType="branch"
                    currentModelId={message.model}
                    onAction={handleBranch}
                    isLoading={isBranching}
                    onOpenChange={setIsDropdownOpen}
                    hasImages={
                      message.attachmentIds && message.attachmentIds.length > 0
                    }
                  />
                )}

                {/* Regenerate dropdown - replaces current response */}
                {onRegenerate && (
                  <ModelActionDropdown
                    actionType="regenerate"
                    currentModelId={message.model}
                    onAction={handleRegenerate}
                    isLoading={isRegenerating}
                    onOpenChange={setIsDropdownOpen}
                    hasImages={
                      message.attachmentIds && message.attachmentIds.length > 0
                    }
                  />
                )}
              </>
            )}

            {/* <Button
              onClick={handleSend}
              disabled
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-1"
            >
              {isSent ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button> */}
            <Button
              onClick={handleCopy}
              size="sm"
              variant="ghost"
              className={cn("h-8 w-8 p-1", isCopied && "pointer-events-none")}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <span className="text-xs">
              {AI_MODELS_NAMES.includes(message.model)
                ? AI_MODELS[message.model].title
                : message.model}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

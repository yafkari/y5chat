import { cn, generateUUID } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router";
import {
  useSessionQuery,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";
import { useSidebar } from "@/components/ui/sidebar";
import { FloatingSidebarTrigger } from "@/frontend/components/floating-sidebar-trigger";
import ChatInputWrapper from "./chat-input-wrapper";
import MessageEntry from "./chat/message-entry";
import { useAuthToken } from "@convex-dev/auth/react";
import EmptyState from "./chat/empty-state";
import { handleStreamingResponse } from "../utils/helpers";
import useEphemeralSettings from "@/hooks/use-ephemeral-settings";
import { modelSupportsFeature } from "@/app/backend/lib/models";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chat() {
  const { threadId } = useParams();
  const { open } = useSidebar();
  const isMobile = useIsMobile();
  const token = useAuthToken();
  const navigate = useNavigate();
  const { isWebSearch, isImageGeneration } = useEphemeralSettings();
  const messages = useSessionQuery(api.messages.getByThreadId, { threadId });
  const [captchaToken] = useState<string>("dummy");

  // Add abort controller ref for stopping streams in chat operations
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedModel = useSessionQuery(api.userPreferences.getSelectedModel);
  const deleteMessagesFromIndex = useSessionMutation(
    api.messages.deleteMessagesFromIndex
  );
  const createBranchedThread = useSessionMutation(
    api.messages.createBranchedThread
  );

  const [streamingContent, setStreamingContent] = useState<{
    messageId: string;
    content: string;
    reasoning: string;
    streamingImages: { base64: string; fileKey: string; alt: string }[];
  } | null>(null);

  // Function to stop streaming from chat operations (regenerate, branch, edit)
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreamingContent(null);
    }
  }, [setStreamingContent]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatInputWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [chatInputWrapperHeight, setChatInputWrapperHeight] = useState<
    number | null
  >(null);
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);

  // Function to set input value from EmptyState
  const setInputValue = useCallback((value: string) => {
    if (chatInputRef.current) {
      chatInputRef.current.value = value;
      chatInputRef.current.focus();
    }
  }, []);

  const resetCaptcha = useCallback(() => {
    // window.turnstile?.reset();
    // setCaptchaToken(undefined);
  }, []);

  const handleNewThread = useCallback(() => {
    navigate("/chat");
  }, [navigate]);

  const handleRegenerate = useCallback(
    async (messageId: string, modelId?: string) => {
      if (!messages || !threadId) return;

      // Check if captcha token is available
      if (!captchaToken) {
        toast.error(
          "Please wait for the security check to complete before regenerating messages"
        );
        return;
      }

      // Find the message to regenerate
      const messageIndex = messages.findIndex((m) => m.messageId === messageId);
      if (messageIndex === -1) return;

      const messageToRegenerate = messages[messageIndex];

      // For user messages, we want to regenerate the assistant's response
      // For assistant messages, we regenerate that response
      let messagesUpToRegenerate;
      let fromMessageId;

      let updatedUserMessage = null;

      if (messageToRegenerate.role === "user") {
        // For user messages, we need to handle model changes differently
        if (modelId && modelId !== messageToRegenerate.model) {
          // If model is changing, delete the user message and everything after it
          fromMessageId = messageId;
          messagesUpToRegenerate = messages.slice(0, messageIndex);
          updatedUserMessage = {
            ...messageToRegenerate,
            model: modelId,
            updated_at: Date.now(),
            created_at: Date.now(),
          };
          // Add the updated user message to the conversation
          messagesUpToRegenerate = [
            ...messagesUpToRegenerate,
            updatedUserMessage,
          ];
        } else {
          // If model is not changing, keep the user message and delete everything after it
          messagesUpToRegenerate = messages.slice(0, messageIndex + 1);
          // Find the next message (should be assistant) to delete from
          const nextMessageIndex = messageIndex + 1;
          if (nextMessageIndex < messages.length) {
            fromMessageId = messages[nextMessageIndex].messageId;
          } else {
            // No messages after this user message, nothing to delete
            fromMessageId = null;
          }
        }
      } else {
        // For assistant messages, get all messages up to (but not including) the message to regenerate
        messagesUpToRegenerate = messages.slice(0, messageIndex);
        fromMessageId = messageId;
      }

      // Generate new IDs for the regenerated response
      const responseMessageId = generateUUID();
      const streamId = generateUUID();

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Delete messages if there are any to delete
        if (fromMessageId) {
          await deleteMessagesFromIndex({
            threadId,
            fromMessageId,
          });
        }

        // Convert messages to AI SDK format
        const aiSdkMessages = messagesUpToRegenerate.map((msg) => ({
          id: msg.messageId,
          role: msg.role,
          parts: msg.parts,
          attachments: [],
        }));

        // Check if the model supports web search
        const modelToUse = modelId || selectedModel;
        const supportsWebSearch = modelToUse
          ? modelSupportsFeature(modelToUse, "webSearch")
          : false;
        const supportsImageGeneration = modelToUse
          ? modelSupportsFeature(modelToUse, "imageGeneration")
          : false;

        let sessionId = localStorage.getItem("convex-session-id");
        if (sessionId && sessionId.startsWith('"') && sessionId.endsWith('"')) {
          sessionId = sessionId.slice(1, -1);
        }

        // Make the streaming request
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: aiSdkMessages,
            threadMetadata: {
              threadId: threadId,
            },
            responseMessageId,
            streamId,
            model: modelToUse,
            convexSessionId: sessionId,
            modelParams: {
              reasoningEffort: "medium" as const,
              includeSearch: isWebSearch && supportsWebSearch,
              includeImageGeneration:
                isImageGeneration && supportsImageGeneration,
            },
            userInfo: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              languages: navigator.languages,
            },
            isRegeneration: true, // Flag to indicate this is a regeneration
            ...(updatedUserMessage && { editedMessage: updatedUserMessage }), // Pass updated user message if it exists
            captchaToken: captchaToken || undefined,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("You need to be logged in to regenerate messages");
          } else if (response.status === 400) {
            // Try to get more specific error message
            try {
              const errorData = await response.json();
              if (errorData.error && errorData.error.includes("captcha")) {
                toast.error(
                  "Security check failed. Please refresh the page and try again."
                );
              } else {
                toast.error(
                  errorData.error ||
                    "Invalid request. Please try regenerating again."
                );
              }
            } catch {
              toast.error("Invalid request. Please try regenerating again.");
            }
          } else {
            toast.error("Failed to regenerate message. Please try again.");
          }

          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await handleStreamingResponse(
          response,
          responseMessageId,
          setStreamingContent,
          abortController
        );
      } catch (error) {
        // Handle abort error gracefully
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Regeneration was cancelled by user");
          return; // Don't show error toast for user-initiated cancellation
        }
        console.error("Error regenerating chat:", error);
        toast.error("Error regenerating chat");
        setStreamingContent(null);
      } finally {
        // Clean up abort controller
        abortControllerRef.current = null;
        resetCaptcha();
      }
    },
    [
      messages,
      threadId,
      token,
      selectedModel,
      deleteMessagesFromIndex,
      isWebSearch,
      isImageGeneration,
      captchaToken,
      resetCaptcha,
    ]
  );

  const handleBranch = useCallback(
    async (messageId: string, modelId?: string) => {
      if (!messages || !threadId) return;

      // Check if captcha token is available
      if (!captchaToken) {
        toast.error(
          "Please wait for the security check to complete before branching conversations"
        );
        return;
      }

      // Find the message to branch from
      const messageIndex = messages.findIndex((m) => m.messageId === messageId);
      if (messageIndex === -1) return;

      const messageToBranchFrom = messages[messageIndex];

      // Generate new thread ID
      const newThreadId = generateUUID();

      try {
        // Create the branched thread with messages up to the branch point
        await createBranchedThread({
          originalThreadId: threadId,
          fromMessageId: messageId,
          newThreadId: newThreadId,
        });

        // Get all messages up to (but not including) the message to branch from
        let messagesUpToBranch = messages.slice(0, messageIndex);
        let updatedUserMessage = null;

        // If we're branching from a user message with a different model, include it with updated model
        if (messageToBranchFrom.role === "user") {
          updatedUserMessage = {
            ...messageToBranchFrom,
            model: modelId || selectedModel || messageToBranchFrom.model,
            updated_at: Date.now(),
            createdAt: Date.now(),
          };
          // Add the updated user message to the conversation
          messagesUpToBranch = [...messagesUpToBranch, updatedUserMessage];
        }

        // Generate new IDs for the new response
        const responseMessageId = generateUUID();
        const streamId = generateUUID();

        // Create abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Convert messages to AI SDK format
        const aiSdkMessages = messagesUpToBranch.map((msg) => ({
          id: msg.messageId,
          role: msg.role,
          parts: msg.parts,
          attachments: [],
        }));

        // Check if the model supports web search
        const modelToUse = modelId || selectedModel;
        const supportsWebSearch = modelToUse
          ? modelSupportsFeature(modelToUse, "webSearch")
          : false;
        const supportsImageGeneration = modelToUse
          ? modelSupportsFeature(modelToUse, "imageGeneration")
          : false;

        // Navigate to the new thread immediately
        navigate(`/chat/${newThreadId}`);
        let sessionId = localStorage.getItem("convex-session-id");
        if (sessionId && sessionId.startsWith('"') && sessionId.endsWith('"')) {
          sessionId = sessionId.slice(1, -1);
        }
        // Make the streaming request for the new response
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: aiSdkMessages,
            threadMetadata: {
              threadId: newThreadId,
            },
            responseMessageId,
            streamId,
            model: modelToUse,
            convexSessionId: sessionId,
            modelParams: {
              reasoningEffort: "medium" as const,
              includeSearch: isWebSearch && supportsWebSearch,
              includeImageGeneration:
                isImageGeneration && supportsImageGeneration,
            },
            userInfo: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              languages: navigator.languages,
            },
            isRegeneration: true, // This is similar to regeneration in terms of not needing to persist user messages
            ...(updatedUserMessage && { editedMessage: updatedUserMessage }), // Pass updated user message if it exists
            captchaToken: captchaToken || undefined,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("You need to be logged in to branch conversations");
          } else if (response.status === 400) {
            // Try to get more specific error message
            try {
              const errorData = await response.json();
              if (errorData.error && errorData.error.includes("captcha")) {
                toast.error(
                  "Security check failed. Please refresh the page and try again."
                );
              } else {
                toast.error(
                  errorData.error ||
                    "Invalid request. Please try branching again."
                );
              }
            } catch {
              toast.error("Invalid request. Please try branching again.");
            }
          } else {
            toast.error("Failed to branch conversation. Please try again.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await handleStreamingResponse(
          response,
          responseMessageId,
          setStreamingContent,
          abortController
        );
      } catch (error) {
        // Handle abort error gracefully
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Branch operation was cancelled by user");
          return; // Don't show error toast for user-initiated cancellation
        }
        console.error("Error branching chat:", error);
        toast.error("Error branching chat");
        setStreamingContent(null);
        // If navigation already happened, we might want to show an error in the new thread
      } finally {
        // Clean up abort controller
        abortControllerRef.current = null;
        resetCaptcha();
      }
    },
    [
      messages,
      threadId,
      token,
      selectedModel,
      createBranchedThread,
      navigate,
      isWebSearch,
      isImageGeneration,
      captchaToken,
      resetCaptcha,
    ]
  );

  const handleEdit = useCallback(
    async (messageId: string, newText: string) => {
      if (!messages || !threadId) return;

      // Check if captcha token is available
      if (!captchaToken) {
        toast.error(
          "Please wait for the security check to complete before editing messages"
        );
        return;
      }

      // Find the message to edit
      const messageIndex = messages.findIndex((m) => m.messageId === messageId);
      if (messageIndex === -1) return;

      try {
        // Delete all messages after the edited message
        await deleteMessagesFromIndex({
          threadId,
          fromMessageId: messageId,
        });

        // Update the message with new text
        const updatedMessage = {
          messageId,
          role: "user" as const,
          parts: [{ type: "text", text: newText }],
          model: "",
          status: "done" as const,
          created_at: Date.now(),
          updated_at: Date.now(),
          attachmentIds: [],
        };

        // Generate new response message ID
        const responseMessageId = generateUUID();
        const streamId = generateUUID();

        // Create abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Get all messages up to (but not including) the edited message
        const messagesBeforeEdit = messages.slice(0, messageIndex);

        // Convert messages to AI SDK format and add the edited message
        const aiSdkMessages = [
          ...messagesBeforeEdit.map((msg) => ({
            id: msg.messageId,
            role: msg.role,
            parts: msg.parts,
            attachments: [],
          })),
          {
            id: messageId,
            role: "user" as const,
            parts: [{ type: "text", text: newText }],
            attachments: [],
          },
        ];

        // Check if the model supports web search
        const supportsWebSearch = selectedModel
          ? modelSupportsFeature(selectedModel, "webSearch")
          : false;
        const supportsImageGeneration = selectedModel
          ? modelSupportsFeature(selectedModel, "imageGeneration")
          : false;

        let sessionId = localStorage.getItem("convex-session-id");
        if (sessionId && sessionId.startsWith('"') && sessionId.endsWith('"')) {
          sessionId = sessionId.slice(1, -1);
        }

        // Make the streaming request
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: aiSdkMessages,
            threadMetadata: {
              threadId: threadId,
            },
            responseMessageId,
            streamId,
            model: selectedModel,
            convexSessionId: sessionId,
            modelParams: {
              reasoningEffort: "medium" as const,
              includeSearch: isWebSearch && supportsWebSearch,
              includeImageGeneration:
                isImageGeneration && supportsImageGeneration,
            },
            userInfo: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              languages: navigator.languages,
            },
            isRegeneration: true, // This is similar to regeneration
            editedMessage: updatedMessage, // Pass the edited message to be persisted
            captchaToken: captchaToken || undefined,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("You need to be logged in to edit messages");
          } else if (response.status === 400) {
            // Try to get more specific error message
            try {
              const errorData = await response.json();
              if (errorData.error && errorData.error.includes("captcha")) {
                toast.error(
                  "Security check failed. Please refresh the page and try again."
                );
              } else {
                toast.error(
                  errorData.error ||
                    "Invalid request. Please try editing again."
                );
              }
            } catch {
              toast.error("Invalid request. Please try editing again.");
            }
          } else {
            toast.error("Failed to edit message. Please try again.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await handleStreamingResponse(
          response,
          responseMessageId,
          setStreamingContent,
          abortController
        );
      } catch (error) {
        // Handle abort error gracefully
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Edit operation was cancelled by user");
          return; // Don't show error toast for user-initiated cancellation
        }
        console.error("Error editing message:", error);
        toast.error("Error editing message");
        setStreamingContent(null);
      } finally {
        // Clean up abort controller
        abortControllerRef.current = null;
        resetCaptcha();
      }
    },
    [
      messages,
      threadId,
      token,
      selectedModel,
      deleteMessagesFromIndex,
      isWebSearch,
      isImageGeneration,
      captchaToken,
      resetCaptcha,
    ]
  );

  // Enhanced streaming content clearing logic
  useEffect(() => {
    if (!streamingContent || !messages) return;

    // Find the message that was streaming
    const dbMessage = messages.find(
      (m) => m.messageId === streamingContent.messageId
    );

    if (dbMessage && dbMessage.status === "done") {
      // Get the text content from the database message
      const dbTextContent = dbMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      const dbReasoningContent = dbMessage.parts
        .filter((part) => part.type === "reasoning")
        .map((part) => part.reasoning)
        .join("");

      // Check if the database content matches (or is very close to) the streaming content
      const contentMatches =
        Math.abs(
          dbTextContent.length - (streamingContent.content?.length || 0)
        ) <= 10;
      const reasoningMatches =
        Math.abs(
          dbReasoningContent.length - (streamingContent.reasoning?.length || 0)
        ) <= 10;

      if (contentMatches && reasoningMatches) {
        // Content is synchronized, safe to clear streaming
        setStreamingContent(null);
      }
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "o" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        handleNewThread();
      }
    }

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [handleNewThread]);

  useLayoutEffect(() => {
    if (!chatInputWrapperRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChatInputWrapperHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(chatInputWrapperRef.current);

    // Set initial height
    setChatInputWrapperHeight(
      chatInputWrapperRef.current.getBoundingClientRect().height
    );

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Scroll to bottom on initial load
  useLayoutEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      !hasInitiallyScrolled &&
      scrollContainerRef.current
    ) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
      setHasInitiallyScrolled(true);
    }
  }, [messages, hasInitiallyScrolled]);

  // Reset scroll flag when threadId changes
  useEffect(() => {
    setHasInitiallyScrolled(false);
  }, [threadId]);

  return (
    <>
      {/* Floating Sidebar Trigger */}
      <FloatingSidebarTrigger />

      <div
        className={cn(
          "flex-1 flex flex-col relative overflow-hidden",
          open &&
            !isMobile &&
            "border-l border-primary/10 w-full max-w-[calc(100vw-var(--sidebar-width))] xmx-auto"
        )}
      >
        <div
          ref={scrollContainerRef}
          id="chat-container"
          className={cn(
            "flex-1 flex justify-center relative",
            "overflow-y-auto scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-primary/90 dark:scrollbar-thumb-secondary scrollbar-track-transparent"
          )}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col space-y-12 px-8 pt-10 pb-10 pt-safe-offset-10 relative">
            <div className="flex-1 relative">
              <div
                className="relative p-4 space-y-2"
                style={{
                  paddingBottom: chatInputWrapperHeight
                    ? `${chatInputWrapperHeight + 32}px`
                    : "12rem",
                }}
              >
                <div className="flex flex-col gap-2">
                  {messages === null && (
                    <EmptyState setInputValue={setInputValue} />
                  )}

                  {messages?.map((message) => {
                    // Check if this message is currently streaming
                    const isStreaming =
                      streamingContent?.messageId === message.messageId;
                    const messageToRender = isStreaming
                      ? {
                          ...message,
                          parts: [
                            {
                              type: "text" as const,
                              text: streamingContent.content,
                            },
                            {
                              type: "reasoning" as const,
                              reasoning: streamingContent.reasoning,
                            },
                          ].filter((part) => part.text || part.reasoning), // Only include parts with content
                          status: "streaming" as const,
                        }
                      : message;

                    return (
                      <div key={messageToRender.messageId + "wrapper"}>
                        <MessageEntry
                          key={messageToRender.messageId}
                          message={messageToRender}
                          onRegenerate={(modelId?: string) =>
                            handleRegenerate(messageToRender.messageId, modelId)
                          }
                          onBranch={
                            messageToRender.role === "assistant"
                              ? (modelId?: string) =>
                                  handleBranch(
                                    messageToRender.messageId,
                                    modelId
                                  )
                              : undefined
                          }
                          onEdit={
                            messageToRender.role === "user"
                              ? (newText: string) =>
                                  handleEdit(messageToRender.messageId, newText)
                              : undefined
                          }
                          streamingImages={
                            isStreaming
                              ? streamingContent?.streamingImages
                              : undefined
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ChatInputWrapper
          chatInputWrapperRef={chatInputWrapperRef}
          chatInputRef={chatInputRef}
          key={threadId || "new-chat"}
          threadId={threadId}
          scrollContainerRef={scrollContainerRef}
          setStreamingContent={setStreamingContent}
          captchaToken={captchaToken}
          onCallback={resetCaptcha}
          streamingContent={streamingContent}
          handleStopStreaming={handleStop}
        />

        {/* <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onVerify={setCaptchaToken}
          sandbox={process.env.NODE_ENV === "development"}
          retry="auto"
          retryInterval={2500}
          refreshExpired="auto"
          onExpire={resetCaptcha}
          onError={(e) => {
            toast.error("Security check failed. Please refresh the page and try again.");
            console.error(e);
          }}
        /> */}
      </div>
    </>
  );
}

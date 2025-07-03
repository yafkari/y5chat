import { AI_MODELS, AiModel } from "@/app/backend/lib/models";
import { generateChatStream } from "@/app/backend/generate-chat-stream";
import { ModelParams, MessagePart, UserPreferences, Message } from "@/convex/schema";
import SERVER_CONVEX_CLIENT from "@/app/backend/lib/SERVER_CONVEX_CLIENT";
import { api } from "@/convex/_generated/api";
import { createResumableStreamContext } from "resumable-stream/ioredis";
import { after } from "next/server";
import { redis } from "@/app/backend/lib/redis";
import { SessionId } from "convex-helpers/server/sessions";
import { Id } from "@/convex/_generated/dataModel";
import { getDownloadSignedUrl } from "@/app/backend/lib/s3";

export const maxDuration = 60;

const streamContext = createResumableStreamContext({
  waitUntil: after,
  publisher: redis.publisher,
  subscriber: redis.subscriber,
});

type MessageAttachment = {
  id: string; // user/filekey - Deprecated
  name: string;
  type: string;
  fileKey: string;
};

export type GenerateChatStreamInput = {
  messages: {
    id: string;
    parts: MessagePart[];
    role: "user" | "assistant";
    attachments: MessageAttachment[];
  }[];
  threadMetadata: {
    threadId: string;
    title?: string;
    emoji: string; // Unicode emoji or "unset"
  };
  responseMessageId: string;
  streamId: string;
  model: string;
  convexSessionId?: string;
  modelParams: ModelParams;
  preferences?: Partial<UserPreferences>;
  hcaptchaToken?: string;
  userInfo: {
    id?: string;
    timezone?: string;
    languages?: string[];
  };
  isRegeneration?: boolean; // Add flag to indicate regeneration
  editedMessage?: {
    // Add edited message for edit functionality
    messageId: string;
    role: "user";
    parts: MessagePart[];
    model: string;
    status: "done";
    created_at: number;
    updated_at: number;
    attachmentIds: string[];
  };
  abortSignal?: AbortSignal; // Add abort signal for cancelling streams
};

export async function POST(req: Request) {
  const data = await req.json();

  if (!data.hcaptchaToken) {
    return new Response("Missing hcaptcha token", { status: 400 });
  }

  const captchaPayload = {
    secret: process.env.HCAPTCHA_SECRET_KEY,
    response: data.hcaptchaToken,
  }

  if (process.env.NODE_ENV !== "development") {
    const hcaptchaResponse = await fetch(`https://api.hcaptcha.com/siteverify`, {
      method: "POST",
      body: JSON.stringify(captchaPayload),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const hcaptchaResponseData = await hcaptchaResponse.json();
    if (!hcaptchaResponseData.success) {
      console.error("Invalid hcaptcha token", hcaptchaResponseData);
      return new Response("Invalid hcaptcha token", { status: 400 });
    }
  }

  const {
    messages,
    threadMetadata,
    responseMessageId,
    streamId,
    model,
    convexSessionId,
    modelParams,
    userInfo,
    isRegeneration = false,
    editedMessage,
  } = data as GenerateChatStreamInput;

  // Authentication logic
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;

  // Check if anonymous users are allowed when no token is provided
  if (!token && process.env.ALLOW_ANONYMOUS_USERS !== "true") {
    return new Response("Authentication required", { status: 401 });
  }

  let userId: string;
  let isUserSubscribed: boolean = false;
  if (token) {
    // Set auth token for Convex client and validate it by doing a query
    SERVER_CONVEX_CLIENT.setAuth(token);

    try {
      // Validate token by calling Convex - this will fail if token is invalid
      const currentUser = await SERVER_CONVEX_CLIENT.query(api.users.getCurrentUser, {
        sessionId: (convexSessionId || "temp-session") as SessionId,
      });

      if (currentUser) {
        // Extract real user ID from Convex response
        userId = currentUser.type === "authenticated" ? currentUser._id : `anon:${convexSessionId}`;
        isUserSubscribed = (currentUser?.subscriptionId?.length ?? 0) > 0 && (currentUser?.subscriptionEndsOn ?? 0) > Date.now();
      } else {
        return new Response("Unable to authenticate user", { status: 401 });
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      return new Response("Invalid authentication token", { status: 401 });
    }
  } else {
    // Anonymous user
    userId = `anon:${convexSessionId}`;
  }

  if (!isUserSubscribed && (modelParams.includeImageGeneration || modelParams.includeSearch || messages.some(msg => msg.attachments?.length > 0))) {
    return new Response("Upgrade to Pro to use this feature", { status: 402 });
  }

  if (!Object.keys(AI_MODELS).includes(model)) {
    return new Response("Invalid model", { status: 400 });
  }

  // Add the response message placeholder
  const responseMessage = {
    messageId: responseMessageId,
    role: "assistant" as const,
    parts: [],
    model: model,
    status: "pending" as const,
    createdAt: Date.now(),
    updated_at: Date.now(),
    attachmentIds: [],
    modelParams,
    userId,
    threadId: threadMetadata.threadId,
  };

  // Persist messages to Convex
  try {
    // Process and store attachments if any
    const userMessage = messages.find(msg => msg.role === "user");
    const attachmentIds: Id<"attachments">[] = [];

    if (userMessage?.attachments && userMessage.attachments.length > 0) {
      for (const attachment of userMessage.attachments) {
        const attachmentId = await SERVER_CONVEX_CLIENT.mutation(api.attachments.create, {
          publicMessageIds: [userMessage.id],
          userId,
          filename: attachment.name || "unknown",
          mimeType: attachment.type || "application/octet-stream",
          fileSize: 0, // We don't have file size at this point
          fileKey: attachment.fileKey || "unknown",
          status: "uploaded" as const,
        });
        attachmentIds.push(attachmentId);
      }
    }

    if (isRegeneration) {
      // For regeneration or editing, add the response message and edited message if provided
      const messagesToAdd: Message[] = [responseMessage];

      // If there's an edited message, add it first
      if (editedMessage) {
        messagesToAdd.unshift({
          messageId: editedMessage.messageId,
          role: editedMessage.role,
          parts: editedMessage.parts,
          model: editedMessage.model,
          status: editedMessage.status,
          createdAt: editedMessage.created_at,
          updated_at: editedMessage.updated_at,
          attachmentIds: editedMessage.attachmentIds as Id<"attachments">[],
          modelParams: undefined, // User messages don't have model params
          userId: userId,
          threadId: threadMetadata.threadId,
        });
      }

      await SERVER_CONVEX_CLIENT.mutation(api.messages.addMessagesToThread, {
        threadId: threadMetadata.threadId,
        messages: messagesToAdd,
        userId,
        sessionId: convexSessionId as SessionId,
      });
    } else {
      // For new conversations, add the user message and response
      const messagesToPersist: Message[] = messages.map((msg) => ({
        messageId: msg.id,
        role: msg.role,
        parts: msg.parts,
        model: model,
        status: msg.role === "user" ? ("done" as const) : ("pending" as const),
        createdAt: Date.now(),
        updated_at: Date.now(),
        attachmentIds: msg.id === userMessage?.id ? attachmentIds : [],
        modelParams: msg.role === "assistant" ? modelParams : undefined,
        userId,
        threadId: threadMetadata.threadId,
      }));

      await SERVER_CONVEX_CLIENT.mutation(api.messages.addMessagesToThread, {
        threadId: threadMetadata.threadId,
        messages: [messagesToPersist.at(-1)!, responseMessage], // Add the last user message and response message
        userId,
        sessionId: convexSessionId as SessionId,
      });
    }
  } catch (error) {
    console.error("Error persisting messages:", error);
    return new Response("Failed to persist messages", { status: 500 });
  }

  // Generate signed URLs for attachments before processing
  const messagesWithSignedUrls = await Promise.all(
    messages.map(async (message) => {
      // Check if message has attachments in the attachments array (new messages)
      if (message.attachments && message.attachments.length > 0) {
        const attachmentsWithSignedUrls = await Promise.all(
          message.attachments.map(async (attachment) => {
            try {
              // Generate 5-minute signed URL for AI access
              // Construct proper object key like in the attachment route
              const objectKey = `${userId}/${attachment.fileKey}`;
              const { signedUrl } = await getDownloadSignedUrl(objectKey, 5 * 60);
              return {
                ...attachment,
                signedUrl,
              };
            } catch (error) {
              console.error("Error generating signed URL for attachment:", attachment.id, error);
              return attachment;
            }
          })
        );
        return {
          ...message,
          parts: message.parts.map(part => {
            if (part.type === "file") {
              return {
                ...part,
                data: (attachmentsWithSignedUrls.find(a => a.fileKey === part.data) as { signedUrl: string })?.signedUrl || part.data,
              };
            }
            if (part.type === "image") {
              return {
                ...part,
                image: (attachmentsWithSignedUrls.find(a => a.fileKey === part.image) as { signedUrl: string })?.signedUrl || part.image,
              };
            }
            return part;
          }),
          attachments: attachmentsWithSignedUrls,
        };
      }

      // Check if message has file/image/generated-image parts but no attachments (existing messages from DB)
      const hasFileParts = message.parts.some(part => part.type === "file" || part.type === "image" || part.type === "generated-image");
      if (hasFileParts && (!message.attachments || message.attachments.length === 0)) {
        // Extract file IDs from parts and generate signed URLs
        const fileIds = message.parts
          .filter(part => part.type === "file" || part.type === "image" || part.type === "generated-image")
          .map(part => {
            if (part.type === "file") return part.data;
            if (part.type === "image") return part.image;
            if (part.type === "generated-image") return part.fileKey;
            return null;
          })
          .filter(Boolean);

        if (fileIds.length > 0) {
          const signedUrls = await Promise.all(
            fileIds.map(async (fileId) => {
              try {
                const objectKey = `${userId}/${fileId}`;
                const { signedUrl } = await getDownloadSignedUrl(objectKey, 5 * 60);
                return { fileId, signedUrl };
              } catch (error) {
                console.error("Error generating signed URL for file ID:", fileId, error);
                return { fileId, signedUrl: fileId }; // fallback to original ID
              }
            })
          );

          return {
            ...message,
            parts: message.parts.map(part => {
              if (part.type === "file") {
                const signedUrlData = signedUrls.find(s => s.fileId === part.data);
                return {
                  ...part,
                  data: signedUrlData?.signedUrl || part.data,
                };
              }
              if (part.type === "image") {
                const signedUrlData = signedUrls.find(s => s.fileId === part.image);
                return {
                  ...part,
                  image: signedUrlData?.signedUrl || part.image,
                };
              }
              if (part.type === "generated-image") {
                const signedUrlData = signedUrls.find(s => s.fileId === part.fileKey);
                return {
                  ...part,
                  fileKey: signedUrlData?.signedUrl || part.fileKey,
                };
              }
              return part;
            }),
          };
        }
      }

      return message;
    })
  );

  const stream = await generateChatStream({
    messages: messagesWithSignedUrls,
    threadMetadata: {
      threadId: threadMetadata.threadId,
      title: threadMetadata?.title || "New Thread",
      emoji: threadMetadata?.emoji || "unset",
    },
    responseMessageId,
    streamId,
    model: model as AiModel,
    convexSessionId,
    modelParams,
    preferences: {},
    userInfo: {
      id: userId,
      timezone: userInfo.timezone || "UTC",
      languages: userInfo.languages || [],
    },
    abortSignal: req.signal,
  });

  return new Response(
    await streamContext.resumableStream(streamId, () => stream)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const streamId = searchParams.get("streamId");
  const skipCharCount = searchParams.get("skipCharCount");

  if (!streamId) {
    return new Response("streamId is required", { status: 400 });
  }

  const stream = await streamContext.resumeExistingStream(
    streamId,
    skipCharCount ? parseInt(skipCharCount) : undefined
  );

  if (!stream) {
    return new Response("Stream is already done", {
      status: 422,
    });
  }
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

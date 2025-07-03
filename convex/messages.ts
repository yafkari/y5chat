import { SessionIdArg } from 'convex-helpers/server/sessions';
import { mutation } from "@/convex/_generated/server";
import { Infer, v } from "convex/values";
import { authedMutation, authedQuery, getOrCreateUser, getUserId } from "./utils";
import { Message, MessagePart, MessagePartValidator, MessageStatusValidator, MessageValidator, ProviderMetadata } from './schema';
import { generateUUID } from '@/lib/utils';

export const getByThreadId = authedQuery({
  args: {
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.threadId === undefined) {
      return null;
    }

    const threadId = args.threadId;

    const response = await ctx.db.query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .order("asc")
      .collect();

    return response;
  }
})

export const addMessagesToThread = mutation({
  args: {
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    messages: v.array(MessageValidator),
    ...SessionIdArg
  },
  handler: async (ctx, { threadId, messages, sessionId }) => {
    // Get or create user based on session
    const user = await getOrCreateUser(ctx, sessionId);
    const userIdString = getUserId(user);

    // Check if thread exists, if not create it
    let existingThread = threadId ? await ctx.db
      .query("threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .first() : null;

    if (!existingThread) {
      // Create new thread
      const threadDoc = await ctx.db.insert("threads", {
        threadId: threadId ?? generateUUID(),
        title: "New Thread",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessageAt: Date.now(),
        generationStatus: "pending" as const,
        visibility: "visible" as const,
        userId: userIdString, // Use formatted user ID
        model: messages[0]?.model || "gemini_2_flash",
        pinned: false,
      });
      existingThread = await ctx.db.get(threadDoc);
    }

    // Add all messages to the thread
    for (const message of messages) {
      // Extract content from parts if available, otherwise use content field

      await ctx.db.insert("messages", {
        messageId: message.messageId,
        threadId: existingThread!.threadId,
        userId: userIdString, // Use formatted user ID
        parts: message.parts as MessagePart[] || [],
        role: message.role,
        status: message.status,
        model: message.model,
        createdAt: message.createdAt || Date.now(),
        updated_at: message.updated_at,
        attachmentIds: message.attachmentIds || [],
        modelParams: message.modelParams,
      });
    }

    // Update thread's lastMessageAt
    if (existingThread) {
      await ctx.db.patch(existingThread._id, {
        lastMessageAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const updateMessage = mutation({
  args: {
    messageId: v.string(),
    parts: v.optional(v.array(MessagePartValidator)),
    userId: v.optional(v.string()),
    providerMetadata: v.optional(v.any()),
    sessionId: v.string(),
    status: v.optional(MessageStatusValidator),
    resumableStreamId: v.optional(v.string()),
    serverError: v.optional(MessageValidator.fields.serverError),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_messageId",
        (q) => q.eq("messageId", args.messageId)
      ).first();
    if (!message) throw new Error("Message not found");

    // console.log("[CHAT] updating message", message);
    // console.log("[CHAT] args", args);

    // Do NOT update message if it has already been marked as done
    // (handles update race conditions)
    if (message.status === "done" || message.status === "error") {
      // console.error("Message already done", message);

      // Don't throw because it might break server side on /api/chat
      return;
    }

    const insert: {
      parts?: MessagePart[];
      reasoning?: string;
      status?: Infer<typeof MessageStatusValidator>;
      providerMetadata?: ProviderMetadata;
      resumableStreamId?: string;
      serverError?: Message["serverError"];
    } = {};

    if (args.parts) insert.parts = args.parts as MessagePart[];
    if (args.status) insert.status = args.status;
    if (args.providerMetadata) insert.providerMetadata = args.providerMetadata;
    if (args.resumableStreamId) insert.resumableStreamId = args.resumableStreamId;
    if (args.serverError) insert.serverError = args.serverError;
    // console.log("[CHAT] Insert", insert);

    await ctx.db.patch(message._id, insert);

  }
})

export const deleteMessagesFromIndex = authedMutation({
  args: {
    threadId: v.string(),
    fromMessageId: v.string(),
    userId: v.optional(v.string()),
    ...SessionIdArg
  },
  handler: async (ctx, { threadId, fromMessageId }) => {
    // Get all messages in the thread
    const messages = await ctx.db.query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .order("asc")
      .collect();

    // Find the index of the message to start deleting from
    const fromIndex = messages.findIndex(m => m.messageId === fromMessageId);
    if (fromIndex === -1) {
      throw new Error("Message not found");
    }

    // Delete all messages from this index onwards
    const messagesToDelete = messages.slice(fromIndex);

    for (const message of messagesToDelete) {
      await ctx.db.delete(message._id);
    }

    return { deletedCount: messagesToDelete.length };
  },
});

export const createBranchedThread = authedMutation({
  args: {
    originalThreadId: v.string(),
    fromMessageId: v.string(), // The message to branch from (this message won't be included in the new branch)
    newThreadId: v.string(),
    ...SessionIdArg
  },
  handler: async (ctx, { originalThreadId, fromMessageId, newThreadId }) => {
    // Get the original thread
    const originalThread = await ctx.db
      .query("threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", originalThreadId))
      .first();

    if (!originalThread) {
      throw new Error("Original thread not found");
    }

    // Get all messages in the original thread
    const messages = await ctx.db.query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", originalThreadId))
      .order("asc")
      .collect();

    // Find the index of the message to branch from
    const fromIndex = messages.findIndex(m => m.messageId === fromMessageId);
    if (fromIndex === -1) {
      throw new Error("Message not found");
    }

    // Get all messages up to (but not including) the branch point
    const messagesToCopy = messages.slice(0, fromIndex);

    // Create the new branched thread
    // const newThread = await ctx.db.insert("threads", {
    await ctx.db.insert("threads", {
      threadId: newThreadId,
      title: `${originalThread.title} (Alternative)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessageAt: Date.now(),
      generationStatus: "pending" as const,
      visibility: "visible" as const,
      userId: ctx.userId!,
      model: originalThread.model,
      pinned: false,
      branchParentThreadId: originalThread._id, // Use the document ID, not the threadId string
      branchParentPublicMessageId: fromMessageId,
      branchParent: {
        threadId: originalThreadId,
        title: originalThread.title, // Use title, not messageId
      }
    });

    // Copy all messages up to the branch point to the new thread
    for (const message of messagesToCopy) {
      await ctx.db.insert("messages", {
        messageId: generateUUID(), // Generate new message ID for the copy
        threadId: newThreadId,
        userId: message.userId,
        parts: message.parts,
        role: message.role,
        status: message.status,
        model: message.model,
        createdAt: message.createdAt,
        updated_at: message.updated_at,
        attachmentIds: message.attachmentIds || [],
        modelParams: message.modelParams,
        branches: message.branches,
      });
    }

    return {
      newThreadId,
      copiedMessagesCount: messagesToCopy.length
    };
  },
});

// function getUserIdFromArgs(args: { userId?: string; sessionId: string }) {
//   if (args.userId) return args.userId;

//   return "anon:" + args.sessionId;
// }

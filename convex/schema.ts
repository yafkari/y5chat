import { Infer, v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";
import { vSessionId } from "convex-helpers/server/sessions";
import { authTables } from "@convex-dev/auth/server";
import { CoreUserMessage } from "ai";

const groundingChunkValue = v.object({
  web: v.object({
    uri: v.string(),
    title: v.string(),
  }),
});

// Corresponds to the GroundingSupport type
const groundingSupportValue = v.object({
  segment: v.object({
    startIndex: v.optional(v.number()),
    endIndex: v.optional(v.number()),
    text: v.string(),
  }),
  groundingChunkIndices: v.optional(v.array(v.number())),
  confidenceScores: v.optional(v.array(v.number())),
});

// Corresponds to the GroundingMetadata type
const groundingMetadataValue = v.union(
  v.object({
    webSearchQueries: v.optional(v.array(v.string())),
    searchEntryPoint: v.optional(
      v.object({
        renderedContent: v.string(),
      })
    ),
    groundingChunks: v.optional(v.array(groundingChunkValue)),
    groundingSupports: v.optional(v.array(groundingSupportValue)),
    retrievalMetadata: v.optional(v.any()), // Corresponds to Record<string, unknown>
  }),
  v.null()
);

/**
 * Convex value definition for the ProviderMetadata type.
 * This can be used in your messages table schema.
 */
export const providerMetadataValue = v.object({
  google: v.optional(
    v.object({
      groundingMetadata: v.optional(groundingMetadataValue),
      // Corresponds to Record<string, unknown>[] | null
      safetyRatings: v.optional(v.union(v.array(v.any()), v.null())),
    })
  ),
  openai: v.optional(v.any()),
  deepseek: v.optional(v.object({
    cachedPromptTokens: v.optional(v.number()),
    promptCacheHitTokens: v.optional(v.number()),
    promptCacheMissTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
  }))
});

export const ModelParams = v.object({
  temperature: v.optional(v.number()),
  topP: v.optional(v.number()),
  topK: v.optional(v.number()),
  reasoningEffort: v.optional(
    v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
  ),
  includeSearch: v.optional(v.boolean()),
  includeImageGeneration: v.optional(v.boolean()),
  webSearchContextSize: v.optional(
    v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
  ),
});

export const MessageStatusValidator = v.union(
  v.literal("waiting"),
  v.literal("streaming"),
  v.literal("done"),
  v.literal("error"),
  v.literal("cancelled"),
  v.literal("error.rejected"),
  v.literal("deleted"),
  v.literal("pending")
);

export type jsp = CoreUserMessage["content"];

export const GeneratedImagePartValidator = v.object({

});

export const SourcePartValidator = v.object({
  type: v.literal("source"),
  source: v.object({
    sourceType: v.string(),
    id: v.string(),
    title: v.optional(v.string()),
    url: v.string(),
  }),
});

export const MessagePartValidator = v.union(
  v.object({
    type: v.literal("text"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("reasoning"),
    reasoning: v.string(),
  }),
  v.object({
    type: v.literal("file"),
    data: v.string(),
    filename: v.string(),
    mimeType: v.string(),
  }),
  v.object({
    type: v.literal("image"),
    image: v.string(),
    mimeType: v.string(),
  }),
  v.object({
    type: v.literal("generated-image"),
    fileKey: v.optional(v.string()),
    isBase64: v.optional(v.boolean()),
    alt: v.optional(v.string()),
    isLoading: v.optional(v.boolean()),
  }),
  SourcePartValidator
);

const userTable = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  sessionId: v.optional(vSessionId),
  type: v.optional(v.union(v.literal("anonymous"), v.literal("authenticated"))),
  subscriptionId: v.optional(v.string()),
  subscriptionEndsOn: v.optional(v.number()),
  chatCount: v.optional(v.number()), // credits
  chatProCount: v.optional(v.number()),
  userId: v.optional(v.string()),
  createdAt: v.optional(v.number()),
})
  .index("email", ["email"])
  .index("by_sessionId", ["sessionId"])
  .index("by_subscriptionId", ["subscriptionId"])
  .index("by_type", ["type"])
  .index("by_userId", ["userId"]);

const userPreferencesTable = defineTable({
  userId: v.string(),
  selectedModel: v.string(),
  favoriteModels: v.optional(v.array(v.string())),
  name: v.optional(v.string()),
  selectedTraits: v.optional(v.array(v.string())),
  additionalInfo: v.optional(v.string()),
  theme: v.optional(
    v.union(
      v.literal("system"),
      v.literal("light"),
      v.literal("dark"),
      v.literal("boring-system"),
      v.literal("boring-light"),
      v.literal("boring-dark"),
      v.literal("liquid")
    )
  ),
  disableHorizontalLines: v.optional(v.boolean()),
  streamerMode: v.optional(v.boolean()),
  nerdMode: v.optional(v.boolean()),
}).index("by_userId", ["userId"]);

const threadsTable = defineTable({
  threadId: v.string(),
  title: v.string(),
  emoji: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  lastMessageAt: v.number(),
  generationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    )
  ),
  visibility: v.union(v.literal("visible"), v.literal("archived")),
  userSetTitle: v.optional(v.boolean()),
  userId: v.string(),
  model: v.string(),
  pinned: v.boolean(),
  branchParentThreadId: v.optional(v.id("threads")),
  branchParentPublicMessageId: v.optional(v.string()),
  branchParent: v.optional(
    v.object({
      threadId: v.string(),
      title: v.string(),
    })
  ),
})
  .index("by_user", ["userId"])
  .index("by_threadId", ["threadId"])
  .index("by_user_and_threadId", ["userId", "threadId"])
  .index("by_user_and_updatedAt", ["userId", "updatedAt"])
  .index("by_user_and_pinned", ["userId", "pinned"])
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId"],
  });

const messagesTable = defineTable({
  messageId: v.string(),
  threadId: v.string(),
  userId: v.string(),
  parts: v.array(MessagePartValidator),
  status: MessageStatusValidator,
  updated_at: v.optional(v.number()),
  branches: v.optional(v.array(v.id("threads"))),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  createdAt: v.number(),
  serverError: v.optional(
    v.object({
      type: v.union(
        v.literal("captcha_failed"),
        v.literal("api_key_required"),
        v.literal("org_verification_required"),
        v.literal("unknown")
      ),
      message: v.string(),
    })
  ),
  model: v.string(),
  attachmentIds: v.array(v.id("attachments")),
  modelParams: v.optional(ModelParams),
  providerMetadata: v.optional(providerMetadataValue),
  resumableStreamId: v.optional(v.string()),
  timeToFirstToken: v.optional(v.number()),
  tokensPerSecond: v.optional(v.number()),
  tokens: v.optional(v.number()),
})
  .index("by_threadId", ["threadId"])
  .index("by_thread_and_userid", ["threadId", "userId"])
  .index("by_messageId_and_userid", ["messageId", "userId"])
  .index("by_messageId", ["messageId"])
  .index("by_user", ["userId"]);

const attachmentsTable = defineTable({
  publicMessageIds: v.array(v.string()),
  userId: v.string(),
  filename: v.string(),
  mimeType: v.string(),
  fileSize: v.number(),
  fileKey: v.string(),
  status: v.optional(v.union(v.literal("deleted"), v.literal("uploaded"))),
})
  .index("by_fileKey", ["fileKey"])
  .index("by_userId", ["userId"])
  .index("by_publicMessageIds", ["publicMessageIds"])
  .index("by_userId_and_fileKey", ["userId", "fileKey"]);

export default defineSchema({
  ...authTables,

  users: userTable,

  userPreferences: userPreferencesTable,

  threads: threadsTable,

  messages: messagesTable,

  attachments: attachmentsTable,
});

export type User = Infer<typeof userTable.validator>;
export type UserPreferences = Infer<typeof userPreferencesTable.validator>;
export type Thread = Infer<typeof threadsTable.validator>;
export type Message = Infer<typeof messagesTable.validator>;
export const MessageValidator = messagesTable.validator;
export type Attachment = Infer<typeof attachmentsTable.validator>;
export type ModelParams = Infer<typeof ModelParams>;
export type MessageStatus = Infer<typeof MessageStatusValidator>;
export type MessagePart = Infer<typeof MessagePartValidator>;
export type ProviderMetadata = Infer<typeof providerMetadataValue>;
export type SourcePart = Infer<typeof SourcePartValidator>;
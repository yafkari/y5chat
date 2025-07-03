"use node"

import { SessionIdArg } from "convex-helpers/server/sessions";
import {
  query as baseQuery,
  mutation as baseMutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Type for user context
export type UserContext = {
  user: Doc<"users"> | null;
  sessionId: string;
};

// Custom functions which grab the best possible user information.
export const authedQuery = customQuery(baseQuery, {
  args: SessionIdArg,
  input: async (ctx, { sessionId }) => {
    const user = await getUser(ctx, sessionId);

    const userIdString = user ? getUserId(user) : null;

    return { ctx: { ...ctx, user, sessionId, userId: userIdString }, args: {} };
  },
});

export const authedMutation = customMutation(baseMutation, {
  args: SessionIdArg,
  input: async (ctx, { sessionId }) => {
    const user = await getUser(ctx, sessionId);

    const userIdString = user ? getUserId(user) : null;

    return { ctx: { ...ctx, user, sessionId, userId: userIdString }, args: {} };
  },
});

// Helper to get or create a user based on session
async function getUser(ctx: QueryCtx, sessionId: string): Promise<Doc<"users"> | null> {
  // First check if we have an authenticated user via Convex Auth
  const userId = await getAuthUserId(ctx);
  
  if (userId) {
    // Get the authenticated user from Convex Auth
    const authUser = await ctx.db.get(userId);
    
    if (authUser) {
      return authUser;
    }
  }

  // If no sessionId, we can't do anything
  if (!sessionId) {
    return null;
  }

  // Look for existing anonymous user by sessionId
  const anonymousUser = await ctx.db
    .query("users")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId as any))
    .first();

  return anonymousUser;
}

// Helper to get user ID in the expected format
export function getUserId(user: Doc<"users">): string {
  if (user.type === "authenticated") {
    return user._id;
  } else if (user.type === "anonymous" && user.sessionId) {
    return `anon:${user.sessionId}`;
  } else {
    // Fallback to database ID
    return user._id;
  }
}

// Helper to get or create a user in mutations (where we can insert)
export async function getOrCreateUser(
  ctx: MutationCtx, 
  sessionId: string
): Promise<Doc<"users">> {
  // First check if we have an authenticated user via Convex Auth
  const userId = await getAuthUserId(ctx);

  if (userId) {
    // Get the authenticated user from Convex Auth
    const authUser = await ctx.db.get(userId);
    
    if (authUser) {
      return authUser;
    }
  }

  // If no sessionId, we can't create an anonymous user
  if (!sessionId) {
    throw new Error("No session ID provided for anonymous user");
  }

  // Look for existing anonymous user by sessionId
  let anonymousUser = await ctx.db
    .query("users")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId as any))
    .first();

  if (!anonymousUser) {
    // Create new anonymous user
    const anonymousUserId = await ctx.db.insert("users", {
      name: "Anonymous",
      sessionId: sessionId as any,
      type: "anonymous" as const,
      chatCount: 10,
      createdAt: Date.now(),
    });

    await ctx.db.insert("userPreferences", {
      userId: anonymousUserId,
      selectedModel: "gemini_2_flash",
    });

    anonymousUser = await ctx.db.get(anonymousUserId);
  }

  return anonymousUser!;
}
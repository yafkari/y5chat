import { v } from "convex/values";
import { authedQuery, getUserId } from "./utils";
import { mutation } from "./_generated/server";
import { SessionIdArg } from "convex-helpers/server/sessions";

export const get = authedQuery({
  args: SessionIdArg,
  handler: async (ctx) => {
    const user = ctx.user;
    if (!user) {
      return [];
    }

    const userIdString = getUserId(user);

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user_and_updatedAt", (q) => q.eq("userId", userIdString))
      .order("desc")
      .take(200); // Only show top 200 most recent threads

    const pinnedThreads = await ctx.db
      .query("threads")
      .withIndex("by_user_and_pinned", (q) => q.eq("userId", userIdString).eq("pinned", true))
      .order("desc")
      .take(20); // Only show top 20 pinned threads

    const dedupedCombined = [...pinnedThreads, ...threads]
      .filter((thread, index, self) => 
        index === self.findIndex((t) => t._id === thread._id)
      )
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    return dedupedCombined;
    // return await attachParentsToThreads(ctx, dedupedCombined);
  },
});

export const updateTitleForThread = mutation({
  args: {
      threadId: v.string(),
      userId: v.optional(v.string()),
      title: v.string(),
      sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
    .query("threads")
    .withIndex("by_threadId", q => q.eq("threadId", args.threadId)) // by userandthreadid
    .unique();

  if (!doc) throw new Error("Thread not found");

    await ctx.db.patch(doc._id, {
      title: args.title,
    });
  }
});

export const updateEmojiForThread = mutation({
  args: {
    threadId: v.string(),
    emoji: v.string()
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
    .query("threads")
    .withIndex("by_threadId", q => q.eq("threadId", args.threadId)) // by userandthreadid
    .unique();

    if (!doc) throw new Error("Thread not found");

    await ctx.db.patch(doc._id, {
      emoji: args.emoji,
    });
  }
});

export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.threadId);
  }
});
import { SessionIdArg } from "convex-helpers/server/sessions";
import { authedQuery } from "./utils";
import { v } from "convex/values";
import { ActionCtx, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
import { FREE_CHAT_COUNT } from "@/lib/constants";

const getUserId = async (ctx: QueryCtx | MutationCtx | ActionCtx) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

export const getCurrentUser = authedQuery({
  args: { ...SessionIdArg },
  handler: async (ctx) => {
    const user = ctx.user;

    return user;
  },
});

export function getFullUser(ctx: QueryCtx | MutationCtx, userId: string) {
  return ctx.db
    .query("users")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export const getChatCount = authedQuery({
  args: { ...SessionIdArg },
  handler: async (ctx) => {
    const user = ctx.user;

    return user?.chatCount ?? 0;
  },
});

export const isUserSubscribed = authedQuery({
  args: { ...SessionIdArg },
  handler: async (ctx) => {
    const user = ctx.user;

    if (!user || !user.subscriptionId) {
      return false;
    }

    return (user.subscriptionEndsOn ?? 0) > Date.now();
  },
});

export const updateSubscription = internalMutation({
  args: { subscriptionId: v.string(), userId: v.string(), subscriptionEndsOn: v.number() },
  handler: async (ctx, args) => {
    const user = await getFullUser(ctx, args.userId);

    if (!user) {
      throw new Error("no user found with that user id");
    }

    await ctx.db.patch(user._id, {
      subscriptionId: args.subscriptionId,
      subscriptionEndsOn: args.subscriptionEndsOn,
      chatCount: 1000,
      chatProCount: 100,
    });
  },
});

export const updateSubscriptionBySubId = internalMutation({
  args: { subscriptionId: v.string(), subscriptionEndsOn: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_subscriptionId", (q) =>
        q.eq("subscriptionId", args.subscriptionId)
      )
      .first();

    if (!user) {
      throw new Error("no user found with that user id");
    }

    await ctx.db.patch(user._id, {
      subscriptionEndsOn: args.subscriptionEndsOn,
    });
  },
});

export const updateUserToFree = internalMutation({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_subscriptionId", (q) =>
        q.eq("subscriptionId", args.subscriptionId)
      )
      .first();

    if (!user) {
      throw new Error("no user found with that user id");
    }

    await ctx.db.patch(user._id, {
      subscriptionId: undefined,
      subscriptionEndsOn: undefined,
      chatCount: FREE_CHAT_COUNT,
      chatProCount: 0,
    });
  },
});

// Monthly reset for pro users (those with active subscriptions)
export const resetProUserChatCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all users with active subscriptions
    const subscribedUsers = await ctx.db
      .query("users")
      .withIndex("by_type", (q) => q.eq("type", "authenticated"))
      .collect();

    let resetCount = 0;
    
    for (const user of subscribedUsers) {
      // Check if user has active subscription
      if (user.subscriptionId && (user.subscriptionEndsOn ?? 0) > now) {
        await ctx.db.patch(user._id, {
          chatCount: 1000, // Pro users get 1000 regular chats
          chatProCount: 100, // Pro users get 100 advanced chats
        });
        resetCount++;
      }
    }
    
    console.log(`Reset chat counts for ${resetCount} pro users`);
    return { resetCount };
  },
});

// Daily reset for authenticated free users (those without active subscriptions)
export const resetFreeUserDailyChatCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all authenticated users
    const authenticatedUsers = await ctx.db
      .query("users")
      .withIndex("by_type", (q) => q.eq("type", "authenticated"))
      .collect();

    let resetCount = 0;
    
    for (const user of authenticatedUsers) {
      // Check if user does NOT have active subscription (free user)
      const hasActiveSubscription = user.subscriptionId && (user.subscriptionEndsOn ?? 0) > now;
      
      if (!hasActiveSubscription) {
        await ctx.db.patch(user._id, {
          chatCount: FREE_CHAT_COUNT, // Free authenticated users get 20 chats per day
        });
        resetCount++;
      }
    }
    
    console.log(`Reset daily chat counts for ${resetCount} free authenticated users`);
    return { resetCount };
  },
});
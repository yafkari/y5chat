import { v } from "convex/values";
import { authedMutation, authedQuery } from "./utils";

export const getSelectedModel = authedQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.userId;
    if (!userId) {
      return "gemini_2_flash";
    }

    const userPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return userPreferences?.selectedModel ?? "gemini_2_flash";
  },
});

export const setSelectedModel = authedMutation({
  args: {
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.userId;
    if (!userId) {
      return false;
    }

    // Check if user preferences already exist
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingPreferences) {
      // Update existing preferences
      await ctx.db.patch(existingPreferences._id, {
        selectedModel: args.model,
      });
    } else {
      // Create new preferences
      await ctx.db.insert("userPreferences", {
        userId,
        selectedModel: args.model,
      });
    }

    return true;
  },
});

export const toggleFavoriteModel = authedMutation({
  args: {
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.userId;
    if (!userId) {
      return false;
    }

    // Check if user preferences already exist
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingPreferences) {
      const currentFavorites = existingPreferences.favoriteModels ?? [];
      const isCurrentlyFavorite = currentFavorites.includes(args.model);

      // Toggle the model in favorites
      const updatedFavorites = isCurrentlyFavorite
        ? currentFavorites.filter((model) => model !== args.model)
        : [...currentFavorites, args.model];

      // Update existing preferences
      await ctx.db.patch(existingPreferences._id, {
        favoriteModels: updatedFavorites,
      });
    } else {
      // Create new preferences with the model as favorite
      await ctx.db.insert("userPreferences", {
        userId,
        selectedModel: "gemini_2_flash", // default model
        favoriteModels: [args.model],
      });
    }

    return true;
  },
});

export const getFavoriteModels = authedQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.userId;
    if (!userId) {
      return [];
    }

    const userPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return userPreferences?.favoriteModels ?? [];
  },
});
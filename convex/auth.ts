import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { MutationCtx } from "./_generated/server";
import { FREE_CHAT_COUNT } from "@/lib/constants";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      // If user already exists (updating), just return the existing user ID
      if (args.existingUserId) {
        // Update user info if needed
        await ctx.db.patch(args.existingUserId, {
          name: typeof args.profile.name === 'string' ? args.profile.name : undefined,
          email: typeof args.profile.email === 'string' ? args.profile.email : undefined,
          image: typeof args.profile.picture === 'string' ? args.profile.picture : undefined,
          type: "authenticated",
          userId: args.existingUserId
        });
        return args.existingUserId;
      }

      // Create new authenticated user (no linking with anonymous users)
      const userId = await ctx.db.insert("users", {
        name: typeof args.profile.name === 'string' ? args.profile.name : "User",
        email: typeof args.profile.email === 'string' ? args.profile.email : undefined,
        image: typeof args.profile.image === 'string' ? args.profile.image : undefined,
        type: "authenticated",
        chatCount: FREE_CHAT_COUNT,
        createdAt: Date.now(),
        userId: args.profile.sub as string,
      });

      await ctx.db.insert("userPreferences", {
        userId,
        selectedModel: "gemini_2_flash",
      })

      return userId;
    }
  },
}); 
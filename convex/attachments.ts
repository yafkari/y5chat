import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authedQuery } from "./utils";

export const create = mutation({
  args: {
    publicMessageIds: v.array(v.string()),
    userId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    fileKey: v.string(),
    status: v.optional(v.union(v.literal("deleted"), v.literal("uploaded"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("attachments", {
      publicMessageIds: args.publicMessageIds,
      userId: args.userId,
      filename: args.filename,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      fileKey: args.fileKey,
      status: args.status || "uploaded",
    });
  },
});

export const getByMessageId = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const attachments = await ctx.db.query("attachments").collect();
    return attachments.filter(attachment => 
      attachment.publicMessageIds.includes(args.messageId)
    );
  },
});

export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attachments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.attachmentId, {
      status: "deleted",
    });
  },
});

export const getFiles = authedQuery({
  args: {
    ids: v.array(v.id("attachments"))
  }, 
  handler: async (ctx, args) => {
    if (!ctx.userId) return;

    // Use Promise.all with ctx.db.get to fetch each attachment by ID
    const attachments = await Promise.all(
      args.ids.map(id => ctx.db.get(id))
    );

    // Filter out null results and check ownership
    const validAttachments = attachments
      .filter((attachment): attachment is NonNullable<typeof attachment> => 
        attachment !== null && attachment.userId === ctx.userId
      );

    return validAttachments.map(a => ({
      id: a._id,
      fileKey: a.fileKey,
      mimeType: a.mimeType,
      filename: a.filename,
    }));
  }
})

import { Triggers } from "convex-helpers/server/triggers";
import { DataModel } from "./_generated/dataModel";

const triggers = new Triggers<DataModel>()

// delete all threads and messages when a user is deleted
triggers.register("users", async (ctx, change) => {
  if (change.operation === "delete") {
    for await (const thread of ctx.db.query("threads")
        .withIndex("by_user", q=>q.eq("userId", change.id))) {
      await ctx.db.delete(thread._id);
    }
  }
});

// delete all messages when a thread is deleted
triggers.register("threads", async (ctx, change) => {
  if (change.operation === "delete") {
    for await (const message of ctx.db.query("messages")
        .withIndex("by_threadId", q=>q.eq("threadId", change.oldDoc.threadId))) {
      await ctx.db.delete(message._id);
    }
  }
});

// triggers.register("messages", async (ctx, change) => {
//   if (change.operation === "delete") {
//     for await (const attachment of ctx.db.query("attachments")
//       .withIndex("by_publicMessageIds", q => q.contains("publicMessageIds", change.id))) {

//       // Filter out the deleted message ID from the array
//       const updatedMessageIds = attachment.publicMessageIds.filter(id => id !== change.id);

//       if (updatedMessageIds.length === 0) {
//         // No more messages referencing this attachment – safe to delete
//         await ctx.db.delete(attachment._id);
//       } else {
//         // Still referenced by other messages – update the list
//         await ctx.db.patch(attachment._id, {
//           publicMessageIds: updatedMessageIds
//         });
//       }
//     }
//   }
// });

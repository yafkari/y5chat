"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import Stripe from "stripe";
import { internal } from "./_generated/api";
type Metadata = {
  userId: string;
};

export const pay = action({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("you must be logged in to subscribe");
    }

    // if (!user.emailVerified) { // TODO
    //   throw new Error("you must have a verified email to subscribe");
    // }

    const domain = process.env.PUBLIC_SITE_URL ?? "http://localhost:3000";
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-06-30.basil",
    });
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: process.env.STRIPE_STANDARD_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      metadata: {
        userId: user.subject,
      },
      mode: "subscription",
      success_url: `${domain}`,
      cancel_url: `${domain}`,
    });

    return session.url!;
  },
});

export const fulfill = internalAction({
  args: { signature: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-06-30.basil",
    });

    const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET as string;
    try {
      const event = stripe.webhooks.constructEvent(
        args.payload,
        args.signature,
        webhookSecret
      );

      const completedEvent = event.data.object as Stripe.Checkout.Session & {
        metadata: Metadata;
      };

      if (event.type === "checkout.session.completed") {
        const subscription = await stripe.subscriptions.retrieve(
          completedEvent.subscription as string
        );

        const userId = completedEvent.metadata.userId;

        const payload = {
          userId,
          subscriptionId: subscription.id,
          subscriptionEndsOn: (subscription.items.data.at(0)?.current_period_end ?? 0) * 1000,
        };

        await ctx.runMutation(internal.users.updateSubscription, payload);
      }

      if (event.type === "invoice.payment_succeeded") {
        const invoice = completedEvent as unknown as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const payload = {
            subscriptionId: subscriptionId,
            subscriptionEndsOn: (subscription.items.data.at(0)?.current_period_end ?? 0) * 1000,
          };

          await ctx.runMutation(internal.users.updateSubscriptionBySubId, payload);
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = completedEvent as unknown as Stripe.Subscription;

        await ctx.runMutation(internal.users.updateUserToFree, {
          subscriptionId: subscription.id,
        });
      }

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: (err as { message: string }).message };
    }
  },
});
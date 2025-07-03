/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as stripe from "../stripe.js";
import type * as threads from "../threads.js";
import type * as userPreferences from "../userPreferences.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  attachments: typeof attachments;
  auth: typeof auth;
  crons: typeof crons;
  functions: typeof functions;
  http: typeof http;
  messages: typeof messages;
  stripe: typeof stripe;
  threads: typeof threads;
  userPreferences: typeof userPreferences;
  users: typeof users;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

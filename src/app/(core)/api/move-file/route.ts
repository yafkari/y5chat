import { moveTempFileToPermanent } from "@/app/backend/lib/s3";
import SERVER_CONVEX_CLIENT from "@/app/backend/lib/SERVER_CONVEX_CLIENT";
import { api } from "@/convex/_generated/api";
import { SessionId } from "convex-helpers/server/sessions";

export async function POST(req: Request) {
  const { fileKey } = await req.json();

  if (!fileKey) {
    return new Response("Missing fileKey", { status: 400 });
  }

  // Authentication required for file operations
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const convexSessionId = req.headers.get("x-convex-session-id");

  if (!token) {
    return new Response("Authentication required", { status: 401 });
  }

  // Set auth token for Convex client and validate it by doing a query
  SERVER_CONVEX_CLIENT.setAuth(token);

  let userId: string;
  let isUserSubscribed = false;
  try {
    // Validate token by calling Convex - this will fail if token is invalid
    const currentUser = await SERVER_CONVEX_CLIENT.query(api.users.getCurrentUser, {
      sessionId: (convexSessionId || "temp-session") as SessionId,
    });

    if (currentUser) {
      // Extract real user ID from Convex response
      userId = currentUser.type === "authenticated" ? currentUser._id : `anon:${convexSessionId}`;
      isUserSubscribed = (currentUser?.subscriptionId?.length ?? 0) > 0 && (currentUser?.subscriptionEndsOn ?? 0) > Date.now();
    } else {
      return new Response("Unable to authenticate user", { status: 401 });
    }
  } catch (error) {
    console.error("Token validation failed:", error);
    return new Response("Invalid authentication token", { status: 401 });
  }

  if (!isUserSubscribed) {
    return new Response("Upgrade to Pro to use this feature", { status: 402 });
  }

  try {
    const { imageUrl, key } = await moveTempFileToPermanent(fileKey, userId);

    return Response.json({
      key,
      imageUrl,
    });
  } catch (error) {
    console.error("Error moving file:", error);
    return new Response(
      error instanceof Error ? error.message : "Failed to move file",
      { status: 500 }
    );
  }
} 
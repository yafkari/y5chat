import { getUploadSignedUrl } from "@/app/backend/lib/s3";
import SERVER_CONVEX_CLIENT from "@/app/backend/lib/SERVER_CONVEX_CLIENT";
import { api } from "@/convex/_generated/api";
import { SessionId } from "convex-helpers/server/sessions";

export async function POST(req: Request) {
  const { fileType, fileSize, isTemp = true } = await req.json();

  if (!fileType || !fileSize) {
    return new Response("Missing fileType or fileSize", { status: 400 });
  }

  // Authentication required for uploads
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const convexSessionId = req.headers.get("x-convex-session-id");
  
  if (!token) {
    return new Response("Authentication required", { status: 401 });
  }

  // Set auth token for Convex client and validate it by doing a query
  SERVER_CONVEX_CLIENT.setAuth(token);
  
  let userId: string;
  try {
    // Validate token by calling Convex - this will fail if token is invalid
    const currentUser = await SERVER_CONVEX_CLIENT.query(api.users.getCurrentUser, {
      sessionId: (convexSessionId || "temp-session") as SessionId,
    });
    
    if (currentUser) {
      // Extract real user ID from Convex response
      userId = currentUser.type === "authenticated" ? currentUser._id : `anon:${convexSessionId}`;
    } else {
      return new Response("Unable to authenticate user", { status: 401 });
    }
  } catch (error) {
    console.error("Token validation failed:", error);
    return new Response("Invalid authentication token", { status: 401 });
  }

  try {
    const { presignedUrl, fileKey } = await getUploadSignedUrl({
      userId,
      fileType,
      fileSize,
      isTemp,
    });

    return Response.json({
      fileKey,
      presignedUrl,
      isTemp
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);

    if (error instanceof Error && error.message.includes("File size is too large")) {
      return new Response("File size is too large", { status: 400 });
    }

    if (error instanceof Error && error.message.includes("File type is not an image or pdf")) {
      return new Response("File type is not an image or pdf", { status: 400 });
    }

    return new Response(
      error instanceof Error ? error.message : "Failed to generate upload URL",
      { status: 500 }
    );
  }
} 
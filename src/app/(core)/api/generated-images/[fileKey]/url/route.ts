import { getDownloadSignedUrl } from "@/app/backend/lib/s3";
import { NextRequest, NextResponse } from "next/server";
import SERVER_CONVEX_CLIENT from "@/app/backend/lib/SERVER_CONVEX_CLIENT";
import { api } from "@/convex/_generated/api";
import { SessionId } from "convex-helpers/server/sessions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
    const { fileKey } = await params;

    if (!fileKey) {
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 }
      );
    }

    // Authentication required for generated images
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

    const { signedUrl, expiresAt } = await getDownloadSignedUrl(
      `generated-images/${userId}/${fileKey}`,
      60 * 60 // 1 hour expiry for generated images
    );

    return NextResponse.json({
      signedUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("Error generating signed URL for generated image:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
} 
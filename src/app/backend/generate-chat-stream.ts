"server-only";

import { api } from "@/convex/_generated/api";
import SERVER_CONVEX_CLIENT from "@/app/backend/lib/SERVER_CONVEX_CLIENT";
import {
  streamText,
  createDataStream,
  ProviderMetadata,
  extractReasoningMiddleware,
  wrapLanguageModel,
  CoreMessage,
  Tool,
  ToolChoice,
} from "ai";
import {
  generateEmojiFromUserMessage,
  generateTitleFromUserMessage,
} from "./helpers";
import { waitUntil } from "@vercel/functions";
import { systemPrompt } from "@/lib/constants";
import { GenerateChatStreamInput } from "../(core)/api/chat/route";
import {
  AI_MODELS,
  AiModel,
  buildProviderOptions,
  modelSupportsFeature,
  getModelDefaultToolSettings,
} from "./lib/models";
import { SessionId } from "convex-helpers/server/sessions";
import type { MessagePart, SourcePart } from "@/convex/schema";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { imageGenTool } from "./tools/image-gen";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  },
});

// Function to upload base64 image to S3
async function uploadImageToS3(base64Data: string, userId: string): Promise<{objectKey: string, fileKey: string}> {
  const buffer = Buffer.from(base64Data, 'base64');
  const fileId = crypto.randomUUID();
  const objectKey = `generated-images/${userId}/${fileId}.png`;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: objectKey,
    Body: buffer,
    ContentType: 'image/png',
    Metadata: {
      userId,
      type: 'generated-image',
      timestamp: Date.now().toString(),
    },
  }));

  return {objectKey, fileKey: fileId + ".png"};
}

export const InitialText = "🖼️ Image Generation";

export async function generateChatStream({
  messages,
  threadMetadata,
  responseMessageId,
  streamId,
  model,
  convexSessionId,
  modelParams,
  // preferences,
  userInfo,
  abortSignal,
}: GenerateChatStreamInput) {
  // TODO: Rate limit checks

  if (!threadMetadata?.title || threadMetadata?.title === "New Thread") {
    const titleGenPromise = generateTitleFromUserMessage(
      messages?.at(0)?.parts?.find((part) => part.type === "text")?.text ?? "",
      userInfo.languages ?? []
    ).then(({ text }) => {
      // update in convex
      SERVER_CONVEX_CLIENT.mutation(api.threads.updateTitleForThread, {
        threadId: threadMetadata.threadId,
        userId: userInfo.id,
        title: text.trim(),
        sessionId: convexSessionId,
      });
    });

    waitUntil(titleGenPromise);
  }

  if (threadMetadata?.emoji === "unset") {
    const emojiGenPromise = generateEmojiFromUserMessage(
      messages?.at(0)?.parts?.find((part) => part.type === "text")?.text ?? ""
    ).then(({ text: emoji }) => {
      // update in convex
      SERVER_CONVEX_CLIENT.mutation(api.threads.updateEmojiForThread, {
        threadId: threadMetadata.threadId,
        emoji,
      });
    });

    waitUntil(emojiGenPromise);
  }

  const selectedModel = AI_MODELS[model as AiModel];

  const supportsSearch = modelSupportsFeature(model as AiModel, "webSearch");
  const modelToolSettings = getModelDefaultToolSettings(model as AiModel);

  // Build provider options based on model config and user preferences
  const providerOptions = buildProviderOptions(model as AiModel, {
    reasoningEffort: modelParams.reasoningEffort,
    includeSearch: modelParams.includeSearch,
    webSearchContextSize: modelParams.webSearchContextSize,
  });

  // Determine if we should use web search and how to configure it
  const shouldUseSearch = modelParams.includeSearch && supportsSearch;
  const provider = selectedModel.provider.toLowerCase();
  const contextSize =
    modelParams.webSearchContextSize ||
    modelToolSettings.webSearch?.contextSize ||
    "medium";

  // For Google models, configure search grounding via model options
  let modelToUse = selectedModel.model;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toolsToUse: Record<string, any> | undefined = undefined;
  let toolChoiceToUse: ToolChoice<Record<string, Tool>> | undefined = undefined;

  if (shouldUseSearch) {
    if (provider === "google") {
      // Google models use search grounding, not traditional tools
      modelToUse = google(selectedModel.model.modelId, {
        useSearchGrounding: true,
      });
    } else {
      // For OpenAI and other providers, use OpenAI's web search tools
      toolsToUse = {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: contextSize,
        }),
      };
      toolChoiceToUse = { type: "tool", toolName: "web_search_preview" };
    }
  }

  if (modelParams.includeImageGeneration) {
    toolsToUse = {
      ...(toolsToUse || {}),
      image_gen: imageGenTool,
    };
    toolChoiceToUse = { ...(toolChoiceToUse || {}), type: "tool", toolName: "image_gen" };
  }

  const aiSdkResponse = streamText({
    model: wrapLanguageModel({
      model: modelToUse,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.parts
        .filter((part) => {
          // Filter out reasoning and source parts for AI SDK compatibility
          // The reasoning middleware will handle reasoning extraction
          // Source parts are for display only and not needed for AI processing
          return part.type !== "reasoning" && part.type !== "source";
        })
        .map((part) => {
          switch (part.type) {
            case "text":
              return { type: "text", text: part.text };
            case "image":
              return {
                type: "image",
                image: part.image,
                ...(part.mimeType && { mimeType: part.mimeType }),
              };
            case "file":
              return {
                type: "file",
                data: part.data,
                mimeType: part.mimeType,
              };
            // case "source": -> TODO: convert to text
              // return {
              //   type: "source",
              //   source: part.source,
              // };
            case "generated-image":
              // Convert generated images to text for conversation history
              // Skip loading placeholders (they have fileKey starting with "loading-")
              if (part.fileKey?.startsWith("loading-")) {
                return null; // Filter out loading placeholders
              }
              return {
                type: "text",
                text: part.alt ? `[Generated image: ${part.alt}]` : "[Generated image]",
              };
            default:
              return part;
          }
        })
        .filter(Boolean), // Remove null entries (loading placeholders)
    })) as Array<CoreMessage>,
    system: systemPrompt(selectedModel.title, new Date().toLocaleString()),
    providerOptions: providerOptions
      ? {
          [modelToUse.provider.toLowerCase()]: providerOptions,
        }
      : undefined,
    ...(toolsToUse ? { tools: toolsToUse } : {}),
    toolChoice: toolChoiceToUse,
    toolCallStreaming: true,
    abortSignal: abortSignal,
  });

  const dataStream = createDataStream({
    execute: async (dataStream) => {
      // write results to stream.
      dataStream.writeData({
        type: "ratelimit",
        content: JSON.stringify({
          limit: 1000,
          remaining: 1000,
          reset: Date.now() + 1000,
        }),
      });

      // attach to data stream
      aiSdkResponse.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
        sendUsage: true,
        sendSources: true,
      });

      async function updateMessageContent(update: {
        content?: string;
        reasoning?: string;
        sources?: SourcePart[];
        images?: { fileKey: string; alt: string; isLoading?: boolean }[]; // Add isLoading flag
        status: "streaming" | "done";
      }) {
        const textParts: MessagePart[] = [];
        
        // Add main content if exists
        if (update.content) {
          textParts.push({ type: "text", text: update.content });
        }
        
        await SERVER_CONVEX_CLIENT.mutation(api.messages.updateMessage, {
          messageId: responseMessageId,
          userId: userInfo.id,
          sessionId: convexSessionId as SessionId,
          parts: [
            ...textParts,
            update.reasoning
              ? { type: "reasoning", reasoning: update.reasoning }
              : undefined,
            ...(update.sources || []),
            ...(update.images || [])
              .map((img) => ({
                type: "generated-image",
                fileKey: img.fileKey, // Store fileKey (including loading placeholders for persistence)
                isBase64: false, // Never base64 in Convex
                alt: img.alt, // Store the prompt as alt text
                isLoading: img.isLoading, // Include loading state - this is the key flag
              })),
          ].filter(Boolean) as MessagePart[],
          status: update.status,
          resumableStreamId: update.status === "done" ? undefined : streamId, // reset if done.
        });
      }

      let content = "";
      let reasoning = "";
      const sources: SourcePart[] = [];
      const images: { fileKey: string; alt: string; isLoading?: boolean }[] = []; // Add isLoading flag
      const pendingToolCalls = new Map<string, { prompt: string; startText: string; toolCallId: string }>(); // Track tool calls and their building prompts

      let lastSentTime = Date.now();
      let pending = false;
      for await (const chunk of aiSdkResponse.fullStream) {
        switch (chunk.type) {
          case "reasoning":
            reasoning += chunk.textDelta;
            break;
          case "text-delta":
            content += chunk.textDelta;
            break;
          case "source": {
            sources.push({
              type: "source",
              source: chunk.source,
            });

            break;
          }
          case "file": {
            // TODO: handle files
            console.log("FILE uploaded", chunk.mimeType);
            break;
          }

          case "tool-call-streaming-start":
            console.log("tool call streaming start", chunk);
            if (chunk.toolName === 'image_gen' && chunk.toolCallId) {
              const startText = `\n\n${InitialText}`;
              pendingToolCalls.set(chunk.toolCallId, { prompt: "", startText, toolCallId: chunk.toolCallId });
              // Add the start text to main content (permanent)
              content += startText;
              
              // Add a placeholder image for loading state
              const loadingImage = { fileKey: `loading-${chunk.toolCallId}`, alt: "Generating image...", isLoading: true };
              images.push(loadingImage);
              
              // Send the start text to client immediately
              dataStream.writeData({
                type: "text-delta",
                textDelta: startText,
              });
              
              // Send the loading image state to client immediately
              dataStream.writeData({
                type: "generated-image-loading",
                content: JSON.stringify({
                  fileKey: loadingImage.fileKey,
                  alt: loadingImage.alt,
                  isLoading: true,
                  toolCallId: chunk.toolCallId,
                }),
              });

              // Immediately persist the loading state to database
              await updateMessageContent({
                content,
                reasoning,
                sources,
                images,
                status: "streaming",
              });
            }
            break;
          case "tool-call-delta":
            // console.log("tool call delta", chunk);
            // Just accumulate the JSON chunks, don't add to content yet
            if (chunk.toolCallId && pendingToolCalls.has(chunk.toolCallId)) {
              const toolCall = pendingToolCalls.get(chunk.toolCallId)!;
              if (chunk.argsTextDelta) {
                toolCall.prompt += chunk.argsTextDelta;
                pendingToolCalls.set(chunk.toolCallId, toolCall);
              }
            }
            break;
          case "tool-call":
            console.log("tool call", chunk);
            // Finalize the tool call and store the prompt for alt text
            if (chunk.toolName === 'image_gen' && chunk.toolCallId) {
              const toolCall = pendingToolCalls.get(chunk.toolCallId);
              let finalPrompt = "";
              
              if (toolCall) {
                // Try to extract prompt from accumulated delta chunks
                try {
                  const parsed = JSON.parse(toolCall.prompt);
                  finalPrompt = parsed.prompt || chunk.args.prompt || "";
                } catch {
                  // Fallback to the complete tool call args
                  finalPrompt = chunk.args.prompt || "";
                }
              } else {
                // Fallback if we didn't get the streaming start
                finalPrompt = chunk.args.prompt || "";
                const startText = `\n\n${InitialText}`;
                content += startText;
                
                // Send the start text to client immediately
                dataStream.writeData({
                  type: "text-delta",
                  textDelta: startText,
                });
              }
              
              // Update the stored tool call with original prompt (for alt text)
              pendingToolCalls.set(chunk.toolCallId, { prompt: finalPrompt, startText: "", toolCallId: chunk.toolCallId });
            }
            break;
          case "tool-result":
            console.log("tool result", chunk.result);
            if (chunk.result.images && Array.isArray(chunk.result.images) && chunk.toolCallId) {
              // Get the prompt for this tool call
              const toolCall = pendingToolCalls.get(chunk.toolCallId);
              const prompt = toolCall?.prompt || "Generated image";
              
              // Upload images to S3 immediately during streaming
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const uploadPromises = chunk.result.images.map(async (img: any) => {
                try {
                  if (!userInfo.id) {
                    console.error("User ID is missing, cannot upload image to S3");
                    return null;
                  }
                  const base64Data = img.base64Data || img;
                  const { fileKey } = await uploadImageToS3(base64Data, userInfo.id as string);
                  
                  // Send the base64 data to the data stream for immediate client display
                  dataStream.writeData({
                    type: "generated-image-stream",
                    content: JSON.stringify({
                      base64: base64Data,
                      fileKey: fileKey,
                      alt: prompt, // Include alt text in stream
                      toolCallId: chunk.toolCallId, // Include toolCallId for matching
                    }),
                  });
                  
                  return { fileKey, alt: prompt };
                } catch (error) {
                  console.error("Failed to upload image to S3 during streaming:", error);
                  return null;
                }
              });
              
              const uploadedImages = await Promise.all(uploadPromises);
              const validImages = uploadedImages.filter(img => img !== null) as { fileKey: string; alt: string }[];
              
              // Replace the placeholder image with actual images
              const placeholderIndex = images.findIndex(img => img.fileKey === `loading-${chunk.toolCallId}`);
              if (placeholderIndex !== -1 && validImages.length > 0) {
                // Replace the placeholder with the first image (ensure isLoading is false)
                images[placeholderIndex] = { ...validImages[0], isLoading: false };
                // Add any additional images
                if (validImages.length > 1) {
                  images.push(...validImages.slice(1).map(img => ({ ...img, isLoading: false })));
                }
              } else {
                // Add the images if no placeholder found (fallback)
                images.push(...validImages.map(img => ({ ...img, isLoading: false })));
              }
              
              // Immediately persist the completed state to database
              await updateMessageContent({
                content,
                reasoning,
                sources,
                images,
                status: "streaming",
              });
              
              // Remove from pending
              pendingToolCalls.delete(chunk.toolCallId);
            }
            break;
          case "step-start":
            break;
          case "step-finish":
            break;
          case "finish": {
            // console.log('finish reason:', chunk.finishReason);
            // console.log('input tokens:', chunk.usage.promptTokens);
            // console.log('output tokens:', chunk.usage.completionTokens);
            break;
          }

          case "error":
            console.error("Error:", chunk.error);
            break;

          default:
            console.log("unknown chunk type", chunk);
            break;
        }

        const now = Date.now();
        if (now - lastSentTime >= 500 && !pending) {
          pending = true;
          await updateMessageContent({
            content,
            reasoning,
            sources,
            images,
            status: "streaming",
          })
            .then(() => {
              pending = false;
            })
            .catch((error) => {
              pending = false;
              console.error(
                "[CHAT] Error updating message content mid-stream",
                error
              );
            });
          lastSentTime = now;
        }
      }

      waitUntil(
        updateMessageContent({
          content,
          reasoning,
          sources,
          images, // Already contains fileKeys from streaming
          status: "done",
        })
      );

      waitUntil(
        aiSdkResponse.providerMetadata
          .then((resolvedMetadata: ProviderMetadata | undefined) => {
            if (!resolvedMetadata) {
              return;
            }

            dataStream.writeData({
              type: "provider-metadata", // metadata from provider like search grounding or image gen, .. in case in format i don't know.
              content: JSON.stringify(resolvedMetadata),
            });

            // update in db.
            SERVER_CONVEX_CLIENT.mutation(api.messages.updateMessage, {
              messageId: responseMessageId,
              userId: userInfo.id,
              sessionId: convexSessionId as string,
              providerMetadata: resolvedMetadata,
            });
          })
          .catch((error: unknown) => {
            console.error("[CHAT] Error getting provider metadata", error);
          })
      );
    },
    onError: (error: unknown) => {
      if (abortSignal?.aborted) {
        return "Stream aborted by user";
      }

      console.error("[CHAT] Error streaming", error);

      SERVER_CONVEX_CLIENT.mutation(api.messages.updateMessage, {
        messageId: responseMessageId,
        userId: userInfo.id,
        sessionId: convexSessionId as SessionId,
        status: "error",
        serverError: {
          type: "unknown",
          message: error instanceof Error ? error.message : (error as string),
        },
      });
      return "Error streaming";
    },
  });

  return dataStream;
}

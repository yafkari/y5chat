"server-only";

import { AI_MODELS } from '@/app/backend/lib/models';
import { Message as AiSdkMessage, generateText } from "ai"
import { GenerateChatStreamInput } from "../(core)/api/chat/route";

export const generateTitleFromUserMessage = async (messageContent: string, languages: string[]): ReturnType<typeof generateText> => {
  return generateText({
    // model: openai('gpt-4.1-nano'),
    model: AI_MODELS["gemini_2_flash"].model,
    prompt: 'Generate a brief (max 5 words) title for the following message: ' + messageContent + '. The user speaks these languages: ' + languages.join(', '),
    system: "You are a helpful assistant that generates titles for messages. You always answer with a title in the same language as the message. And does nothing more.",
  })
}

export const generateEmojiFromUserMessage = async (messageContent: string): ReturnType<typeof generateText> => {
  return generateText({
    // model: openai('gpt-4.1-nano'),
    model: AI_MODELS["gemini_2_flash"].model,
    prompt: 'Given this message: ' + messageContent + '. Give me the emoji unicode for the message. Give one and ONLY ONE emoji unicode.',
    system: "You are a helpful assistant that gives the unicode emoji for messages. And does nothing more. When asked a question you don't use the thinking emoji (🤔).",
  })
}

export const convertChatMessageToAiSdkMessage = (message: GenerateChatStreamInput["messages"][number]): AiSdkMessage => {
  const parts = message.parts?.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text }
    } else if (part.type === "reasoning") {
      return { type: "reasoning", reasoning: part.reasoning, details: [] }
    }
  }) as AiSdkMessage["parts"]; // Should be safe, we only have text and reasoning parts.

  return {
    id: message.id,
    role: message.role,
    content: "", // Is it how we should handle this??
    parts,
  }
}

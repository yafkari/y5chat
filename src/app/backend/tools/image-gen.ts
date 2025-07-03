import { tool, experimental_generateImage as generateImage } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

export const imageGenTool = tool({
  description: 'Generate an image based on a prompt',
  parameters: z.object({
    prompt: z.string().describe('The prompt to generate an image from'),
  }),
  execute: async ({ prompt }) => {
    const image = await generateImage({
      model: openai.image('gpt-image-1'),
      prompt,
    });
    return image;
  },
});
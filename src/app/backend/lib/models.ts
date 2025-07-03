/**
 * Unified Model Configuration System
 * 
 * This file serves as the single source of truth for all AI model configurations
 * used throughout the application. It includes:
 * 
 * 1. AI SDK model instances with provider options
 * 2. UI metadata (titles, icons, categories)
 * 3. Capability flags (image upload, PDF support, etc.)
 * 4. Tool settings (web search, reasoning, etc.)
 * 5. Availability controls for incident management
 * 
 * Usage:
 * - Import AI_MODELS for the complete model configuration
 * - Use getEnabledModels() to get only enabled models
 * - Use buildProviderOptions() to create dynamic provider options
 * - Use modelSupportsFeature() to check capabilities
 * - Use toggleModelAvailability() for incident management
 * 
 * When adding new models:
 * 1. Add the model configuration to AI_MODELS
 * 2. Set appropriate capabilities and tool settings
 * 3. Add the provider if it's new to iconMap in model-selector.tsx
 * 4. Test both UI and backend functionality
 */

import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { deepseek } from "@ai-sdk/deepseek";
import { JSONValue, LanguageModel } from "ai";

export interface ModelCapabilities {
  supportsImageUpload: boolean;
  supportsPdfUpload: boolean; // Only models that support both text and image inputs in OpenAI.
  supportsWebSearch: boolean;
  supportsReasoning: boolean;
  supportsImageGeneration?: boolean; // optional while i migrate all models to use it.
  supportsStructuredOutput?: boolean; // optional while i migrate all models to use it.
}

export interface ModelToolSettings {
  webSearch?: {
    enabled: boolean;
    contextSize?: 'low' | 'medium' | 'high';
  };
  imageGeneration?: {
    enabled: boolean;
  };
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
    enabled: boolean;
  };
}

export interface AIModelConfig {
  model: LanguageModel;
  title: string;
  provider: string;
  iconName: string; // Changed from React.ReactNode to string identifier
  isPremium: boolean;
  enabled: boolean; // New property to enable/disable during incidents
  capabilities: ModelCapabilities;
  category: "openai" | "anthropic" | "gemini" | "llama" | "mistral" | "grok" | "deepseek" | "qwen" | "others";
  defaultProviderOptions?: Record<string, Record<string, JSONValue>>;
  supportedTools?: ModelToolSettings;
}

export const AI_MODELS: Record<string, AIModelConfig> = {
  openai_41_nano: {
    model: openai("gpt-4.1-nano"),
    title: "GPT 4.1 Nano",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: false,
      supportsImageGeneration: false,
      supportsStructuredOutput: true,
    },
    category: "openai",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
      imageGeneration: { enabled: true },
    },
  },
  openai_41_mini: {
    model: openai("gpt-4.1-mini"),
    title: "GPT 4.1 Mini",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: false,
      supportsImageGeneration: false,
      supportsStructuredOutput: true,
    },
    category: "openai",
    supportedTools: {
      webSearch: { enabled: true },
      reasoning: { enabled: false },
      imageGeneration: { enabled: false },
    },
  },
  "gpt-4.1": {
    model: openai("gpt-4.1"),
    title: "GPT 4.1",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: false,
      supportsImageGeneration: false,
      supportsStructuredOutput: true,
    },
    category: "openai",
    supportedTools: {
      webSearch: { enabled: true },
      reasoning: { enabled: false },
      imageGeneration: { enabled: true },
    },
  },
  "o3-mini": {
    model: openai("o3-mini"),
    title: "o3 mini",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: true,
      supportsImageGeneration: false,
      supportsStructuredOutput: true,
    },
    category: "openai",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
      imageGeneration: { enabled: true },
    },
  },
  "o4-mini": {
    model: openai("o4-mini"),
    title: "o4 mini",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: true,
      supportsImageGeneration: false,
      supportsStructuredOutput: true,
    },
    category: "openai",
    defaultProviderOptions: {
      openai: {
        reasoningEffort: 'medium',
      },
    },
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { 
        enabled: true,
        effort: 'medium'
      },
    },
  },
  "o3-pro": {
    model: openai("o3-pro"),
    title: "o3 Pro",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: true,
    enabled: false,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: true,
    },
    category: "openai",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  "gpt-4o-mini": {
    model: openai.responses("gpt-4o-mini"),
    title: "GPT 4o Mini",
    provider: "OpenAI",
    iconName: "openai",
    isPremium: false,
    enabled: false,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: false,
    },
    category: "openai",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
    },
  },
  "claude-4-sonnet": {
    model: openai("claude-4-sonnet"), // This would need proper Anthropic provider
    title: "Claude 4 Sonnet",
    provider: "Anthropic",
    iconName: "anthropic",
    isPremium: true,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: false,
    },
    category: "anthropic",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
    },
  },
  "claude-4-sonnet-reasoning": {
    model: openai("claude-4-sonnet-reasoning"), // This would need proper Anthropic provider
    title: "Claude 4 Sonnet (Reasoning)",
    provider: "Anthropic",
    iconName: "anthropic",
    isPremium: true,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: false,
      supportsReasoning: true,
    },
    category: "anthropic",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  gemini_2_flash: {
    model: google("gemini-2.0-flash"),
    title: "Gemini 2.0 Flash",
    provider: "Google",
    iconName: "gemini",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: true,
      supportsReasoning: true,
      supportsImageGeneration: false,
      supportsStructuredOutput: false,
    },
    category: "gemini",
    // Commented out provider options from original
    // providerOptions: {
    //   google: {
    //     responseModalities: [
    //       "TEXT",
    //       "IMAGE",
    //     ],
    //   }
    // }
    supportedTools: {
      webSearch: { 
        enabled: true,
        contextSize: 'medium'
      },
      reasoning: { enabled: false },
    },
  },
  "gemini-2.5-flash": {
    model: google("gemini-2.5-flash"),
    title: "Gemini 2.5 Flash",
    provider: "Google",
    iconName: "gemini",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: true,
      supportsReasoning: true,
      supportsImageGeneration: false,
      supportsStructuredOutput: true,
    },
    category: "gemini",
    supportedTools: {
      webSearch: { 
        enabled: true,
        contextSize: 'medium'
      },
      reasoning: { enabled: true },
    },
  },
  "gemini-2.5-pro": {
    model: google("gemini-2.5-pro"),
    title: "Gemini 2.5 Pro",
    provider: "Google",
    iconName: "gemini",
    isPremium: false,
    enabled: false,
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: true,
      supportsWebSearch: true,
      supportsReasoning: true,
    },
    category: "gemini",
    supportedTools: {
      webSearch: { 
        enabled: true,
        contextSize: 'high'
      },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  "llama-3.3-70b": {
    model: openai("llama-3.3-70b"), // This would need proper Meta provider
    title: "Llama 3.3 70b",
    provider: "Meta",
    iconName: "meta",
    isPremium: false,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: false,
    },
    category: "llama",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
    },
  },
  "llama-4-scout": {
    model: openai("llama-4-scout"), // This would need proper Meta provider
    title: "Llama 4 Scout",
    provider: "Meta",
    iconName: "meta",
    isPremium: false,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: false,
    },
    category: "llama",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
    },
  },
  "grok-3": {
    model: openai("grok-3"), // This would need proper xAI provider
    title: "Grok 3",
    provider: "xAI",
    iconName: "grok",
    isPremium: true,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: false,
    },
    category: "grok",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
    },
  },
  "deepseek-r1": {
    model: deepseek("deepseek-r1"),
    title: "DeepSeek R1",
    provider: "DeepSeek",
    iconName: "deepseek",
    isPremium: false,
    enabled: false,
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: true,
    },
    category: "deepseek",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  "deepseek-r1-llama": {
    model: deepseek("deepseek-r1-llama"),
    title: "DeepSeek R1 (Llama Distilled)",
    provider: "DeepSeek",
    iconName: "deepseek",
    isPremium: false,
    enabled: false,
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: true,
    },
    category: "deepseek",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  "deepseek-r1-qwen": {
    model: deepseek("deepseek-r1-qwen"),
    title: "DeepSeek R1 (Qwen Distilled)",
    provider: "DeepSeek",
    iconName: "deepseek",
    isPremium: false,
    enabled: false,
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: true,
    },
    category: "deepseek",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  'deepseek-reasoner': {
    model: deepseek('deepseek-reasoner'),
    title: "DeepSeek R1",
    provider: "DeepSeek",
    iconName: "deepseek",
    isPremium: false,
    enabled: true,
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: true,
      supportsImageGeneration: false,
      supportsStructuredOutput: false,
    },
    category: "deepseek",
    // Commented out provider options from original
    // providerOptions: {
    //   deepseek: {
    //     'max_tokens': '16k',
    //   },
    // },
    supportedTools: {
      webSearch: { enabled: false },
    },
  },
  "qwen-qwq-32b": {
    model: openai("qwen-qwq-32b"), // This would need proper Qwen provider
    title: "Qwen qwq-32b",
    provider: "Qwen",
    iconName: "qwen",
    isPremium: false,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: false,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: true,
    },
    category: "others",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: true, effort: 'high' },
    },
  },
  "qwen-2.5-32b": {
    model: openai("qwen-2.5-32b"), // This would need proper Qwen provider
    title: "Qwen 2.5 32b",
    provider: "Qwen",
    iconName: "qwen",
    isPremium: false,
    enabled: false, // Disabled until proper provider is set up
    capabilities: {
      supportsImageUpload: true,
      supportsPdfUpload: false,
      supportsWebSearch: false,
      supportsReasoning: false,
    },
    category: "others",
    supportedTools: {
      webSearch: { enabled: false },
      reasoning: { enabled: false },
    },
  },
} as const;

export const AI_MODELS_NAMES = Object.keys(AI_MODELS);
export type AiModel = keyof typeof AI_MODELS;

// Helper functions
export const getModelById = (id: string | null | undefined): AIModelConfig | null => {
  if (!id) return null;
  return AI_MODELS[id] || null;
};

export const getEnabledModels = (): Record<string, AIModelConfig> => {
  return Object.fromEntries(
    Object.entries(AI_MODELS).filter(([, config]) => config.enabled)
  );
};

export const getModelsByCategory = (category: string): Record<string, AIModelConfig> => {
  if (category === "all") return getEnabledModels();
  
  return Object.fromEntries(
    Object.entries(AI_MODELS).filter(([, config]) => 
      config.enabled && (category === "favorites" ? true : config.category === category)
    )
  );
};

// Function to build provider options dynamically based on model settings and user preferences
export const buildProviderOptions = (
  modelId: string,
  userSettings?: {
    reasoningEffort?: 'low' | 'medium' | 'high';
    includeSearch?: boolean;
    webSearchContextSize?: 'low' | 'medium' | 'high';
  }
): Record<string, JSONValue> | null => {
  const model = AI_MODELS[modelId];
  if (!model) return null;

  const providerOptions = model.defaultProviderOptions ? { ...model.defaultProviderOptions } : {};

  // Apply user settings if model supports them
  if (userSettings) {
    // Handle reasoning effort
    if (userSettings.reasoningEffort && model.supportedTools?.reasoning?.enabled) {
      if (model.category === "openai") {
        providerOptions.openai = {
          ...providerOptions.openai,
          reasoningEffort: userSettings.reasoningEffort,
        };
      }
      // Add other providers as needed
    }

    // Handle web search settings
    if (userSettings.includeSearch && model.supportedTools?.webSearch?.enabled) {
      // This would be handled at the tools level, not provider options
    }
  }

  return providerOptions;
};

// Utility function to check if a model supports a specific tool
export const modelSupportsFeature = (
  modelId: string,
  feature: 'webSearch' | 'reasoning' | 'imageUpload' | 'pdfUpload' | 'imageGeneration'
): boolean => {
  const model = AI_MODELS[modelId];
  if (!model || !model.enabled) return false;

  switch (feature) {
    case 'webSearch':
      return model.capabilities.supportsWebSearch && (model.supportedTools?.webSearch?.enabled ?? false);
    case 'reasoning':
      return model.capabilities.supportsReasoning && (model.supportedTools?.reasoning?.enabled ?? false);
    case 'imageUpload':
      return model.capabilities.supportsImageUpload;
    case 'pdfUpload':
      return model.capabilities.supportsPdfUpload;
    case 'imageGeneration':
      return model.capabilities.supportsImageGeneration || model.supportedTools?.imageGeneration?.enabled || false;
    default:
      return false;
  }
};

// Utility function to get default tool settings for a model
export const getModelDefaultToolSettings = (modelId: string): ModelToolSettings => {
  const model = AI_MODELS[modelId];
  return model?.supportedTools ?? {};
};

// Management function to toggle model availability (for incidents)
export const toggleModelAvailability = (modelId: string, enabled: boolean): void => {
  // In a real implementation, this would update a database or configuration store
  // For now, we'll just log the change
  console.log(`Model ${modelId} ${enabled ? 'enabled' : 'disabled'}`);
  
  // You could implement this by:
  // 1. Updating a database record
  // 2. Updating a configuration file
  // 3. Setting environment variables
  // 4. Using a feature flag service
  
  // Example implementation (would need actual persistence):
  // (AI_MODELS[modelId] as any).enabled = enabled;
};
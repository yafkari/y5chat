"use client";

import type React from "react";

import { useState } from "react";
import {
  Search,
  FileText,
  Brain,
  ImageIcon,
  Globe,
  List,
  Heart,
  ImageUpIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Openai,
  Anthropic,
  DeepSeek,
  Grok,
  Gemini,
  Meta,
  Qwen,
} from "@/components/icons";
import {
  useSessionMutation,
  useSessionQuery,
} from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";
import {
  AI_MODELS,
  getEnabledModels,
  modelSupportsFeature,
  type AIModelConfig,
} from "@/app/backend/lib/models";
import { useAction } from "convex/react";

// Icon mapping for rendering
const iconMap = {
  openai: <Openai className="w-5 h-5" />,
  anthropic: <Anthropic className="w-5 h-5" />,
  deepseek: <DeepSeek className="w-5 h-5" />,
  grok: <Grok className="w-5 h-5" />,
  gemini: <Gemini className="w-5 h-5" />,
  meta: <Meta className="w-5 h-5" />,
  qwen: <Qwen className="w-5 h-5" />,
} as const;

// Convert AIModelConfig to the format expected by the UI
interface UIModel {
  id: string;
  name: string;
  provider: string;
  icon: React.ReactNode;
  isPremium: boolean;
  supportsImageUpload: boolean;
  supportsPdfUpload: boolean;
  supportsWebSearch: boolean;
  supportsReasoning: boolean;
  category: string;
}

const convertToUIModel = (id: string, config: AIModelConfig): UIModel => ({
  id,
  name: config.title,
  provider: config.provider,
  icon: iconMap[config.iconName as keyof typeof iconMap] || iconMap.openai,
  isPremium: config.isPremium,
  supportsImageUpload: config.capabilities.supportsImageUpload,
  supportsPdfUpload: config.capabilities.supportsPdfUpload,
  supportsWebSearch: config.capabilities.supportsWebSearch,
  supportsReasoning: config.capabilities.supportsReasoning,
  category: config.category,
});

export const getModelById = (id: string | null | undefined) => {
  if (!id) return null;
  const config = AI_MODELS[id];
  if (!config) return null;
  return convertToUIModel(id, config);
};

const tabs = [
  {
    id: "all",
    label: "All Models",
    icon: <List className="w-4 h-4" />,
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: <Heart className="w-4 h-4 text-destructive" />,
  },
  { id: "openai", label: "OpenAI", icon: <Openai className="w-4 h-4" /> },
  {
    id: "anthropic",
    label: "Anthropic",
    icon: <Anthropic className="w-4 h-4" />,
  },
  { id: "gemini", label: "Gemini", icon: <Gemini className="w-4 h-4" /> },
  { id: "llama", label: "Llama", icon: <Meta className="w-4 h-4" /> },
  { id: "grok", label: "Grok", icon: <Grok className="w-4 h-4" /> },
  { id: "deepseek", label: "DeepSeek", icon: <DeepSeek className="w-4 h-4" /> },
  // { id: "qwen", label: "Qwen", icon: <Qwen className="w-4 h-4" /> },
  { id: "others", label: "Others", icon: <List className="w-4 h-4" /> },
];

const filters = [
  {
    id: "image",
    label: "Image Upload",
    icon: <ImageUpIcon className="w-3 h-3" />,
  },
  { id: "pdf", label: "PDF Upload", icon: <FileText className="w-3 h-3" /> },
  { id: "search", label: "Web Search", icon: <Globe className="w-3 h-3" /> },
  { id: "reasoning", label: "Reasoning", icon: <Brain className="w-3 h-3" /> },
  {
    id: "image-generation",
    label: "Image Generation",
    icon: <ImageIcon className="w-3 h-3" />,
  },
];

export default function ModelSelector({
  chatInputRef,
}: {
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const payAction = useAction(api.stripe.pay);
  const isUserSubscribed = useSessionQuery(api.users.isUserSubscribed);

  const handleUpgrade = async () => {
    try {
      const url = await payAction();
      window.location.href = url;
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };

  const selectedModel = useSessionQuery(api.userPreferences.getSelectedModel);
  const setSelectedModel = useSessionMutation(
    api.userPreferences.setSelectedModel
  );
  const toggleFavoriteModel = useSessionMutation(
    api.userPreferences.toggleFavoriteModel
  );
  const favoriteModels =
    useSessionQuery(api.userPreferences.getFavoriteModels) || [];
  const [activeTab, setActiveTab] = useState("favorites");

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  };

  // Get models from the unified configuration
  const enabledModels = getEnabledModels();
  const models = Object.entries(enabledModels).map(([id, config]) =>
    convertToUIModel(id, config)
  );

  const filteredModels = models.filter((model) => {
    // Filter by tab - but don't return early, continue to other filters
    const passesTabFilter = (() => {
      if (activeTab === "all") return true;
      if (activeTab === "favorites") return favoriteModels.includes(model.id);
      return model.category === activeTab;
    })();

    if (!passesTabFilter) return false;

    // Filter by search
    if (
      searchQuery &&
      !model.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    // Filter by active filters - these should always be applied
    if (activeFilters.includes("premium") && !model.isPremium) return false;
    if (
      activeFilters.includes("image") &&
      !modelSupportsFeature(model.id, "imageUpload")
    )
      return false;
    if (
      activeFilters.includes("pdf") &&
      !modelSupportsFeature(model.id, "pdfUpload")
    )
      return false;
    if (
      activeFilters.includes("search") &&
      !modelSupportsFeature(model.id, "webSearch")
    )
      return false;
    if (
      activeFilters.includes("reasoning") &&
      !modelSupportsFeature(model.id, "reasoning")
    )
      return false;
    if (
      activeFilters.includes("image-generation") &&
      !modelSupportsFeature(model.id, "imageGeneration")
    )
      return false;

    return true;
  });

  const handleModelSelect = (model: UIModel) => {
    if (model.id === selectedModel) return;

    setSelectedModel({ model: model.id });
    setIsOpen(false);
    chatInputRef.current?.focus();
  };

  const handleToggleFavorite = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    toggleFavoriteModel({ model: modelId });
  };

  if (selectedModel === undefined) {
    return null;
  }

  const selectedModelWithFallback = selectedModel ?? "gemini_2_flash";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="py-4 !px-2 hover:bg-primary/10 rounded-full"
        >
          {getModelById(selectedModelWithFallback)?.icon}
          {getModelById(selectedModelWithFallback)?.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-screen max-w-full sm:max-w-4xl sm:w-[90vw] h-screen sm:h-[66vh] p-0 border-0 shadow-2xl flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="px-6 py-4">
          <DialogTitle className="text-xl font-semibold">
            Select AI Model
          </DialogTitle>
          <DialogDescription className="">
            Choose from our collection of AI models. Each model has different
            capabilities.
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full flex-1 min-h-0 sm:flex-row flex-col">
          {/* Sidebar */}
          <aside className="sm:w-1/3 bg-muted/20 p-4 pt-0 flex flex-col gap-1 h-1/4 sm:h-full min-h-0 overflow-y-auto scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-primary/90 dark:scrollbar-thumb-secondary scrollbar-track-transparent">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-background dark:placeholder:text-white/80"
              />
            </div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100 text-left border border-transparent",
                  activeTab === tab.id
                    ? "border-primary dark:border-primary/50"
                    : "hover:border-primary/20 hover:text-accent-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="pt-0 p-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pb-2">
                {filters.map((filter) => (
                  <Badge
                    key={filter.id}
                    variant={
                      activeFilters.includes(filter.id)
                        ? "brand-secondary"
                        : "secondary"
                    }
                    className="cursor-pointer gap-1 rounded-full px-3 py-1"
                    onClick={() => toggleFilter(filter.id)}
                  >
                    {filter.icon}
                    {filter.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Models grid */}
            <div
              className={cn(
                "flex-1 p-6 pt-2 overflow-y-auto min-h-0",
                "scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-primary/90 dark:scrollbar-thumb-secondary scrollbar-track-transparent"
              )}
              style={{
                scrollbarGutter: "stable both-edges",
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredModels.map((model) => (
                  <Tooltip
                    key={model.id}
                    open={
                      !isUserSubscribed && model.isPremium ? undefined : false
                    }
                  >
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => {
                          if (!isUserSubscribed && model.isPremium) return;
                          handleModelSelect(model);
                        }}
                        className={cn(
                          "p-4 rounded-lg transition-all hover:shadow-sm ring-2 ring-accent select-none relative",
                          selectedModelWithFallback === model.id
                            ? "bg-secondary/30 ring-primary dark:ring-primary/50"
                            : "hover:bg-secondary/20 cursor-pointer",
                          !isUserSubscribed &&
                            model.isPremium &&
                            "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {/* Favorite button */}
                        <button
                          onClick={(e) => handleToggleFavorite(e, model.id)}
                          className="absolute top-3 right-3 p-1 rounded-full hover:bg-secondary/50 transition-colors"
                        >
                          <Heart
                            className={cn(
                              "w-4 h-4 transition-colors",
                              favoriteModels.includes(model.id)
                                ? "fill-destructive text-destructive hover:text-destructive/80 hover:fill-destructive/80"
                                : "text-muted-foreground hover:text-destructive"
                            )}
                          />
                        </button>

                        <div className="flex items-start gap-3 pr-8">
                          <div className="flex-shrink-0 mt-0.5 flex flex-col items-center gap-1">
                            {model.icon}
                            {model.isPremium && (
                              <Badge
                                variant="secondary"
                                className="text-xs px-1.5 py-0.5 mt-1 pointer-events-none"
                              >
                                Pro
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Tooltip>
                                <TooltipTrigger
                                  asChild
                                  className={
                                    !isUserSubscribed && model.isPremium
                                      ? "pointer-events-none"
                                      : ""
                                  }
                                >
                                  <h3 className="font-medium truncate text-base">
                                    {model.name}
                                  </h3>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{model.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-sm mb-3">{model.provider}</p>

                            {/* Capability icons */}
                            <div className="flex gap-1.5">
                              {model.supportsImageUpload && (
                                <Tooltip>
                                  <TooltipTrigger
                                    asChild
                                    className={
                                      !isUserSubscribed && model.isPremium
                                        ? "pointer-events-none"
                                        : ""
                                    }
                                  >
                                    <div className="w-6 h-6 p-1 rounded-full flex items-center justify-center">
                                      <ImageUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Supports image upload</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {model.supportsPdfUpload && (
                                <Tooltip>
                                  <TooltipTrigger
                                    className={cn(
                                      "w-6 h-6 p-1 rounded-full flex items-center justify-center",
                                      !isUserSubscribed && model.isPremium
                                        ? "pointer-events-none"
                                        : ""
                                    )}
                                  >
                                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Supports PDF upload</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {model.supportsWebSearch && (
                                <Tooltip>
                                  <TooltipTrigger
                                    className={cn(
                                      "w-6 h-6 p-1 rounded-full flex items-center justify-center",
                                      !isUserSubscribed &&
                                        model.isPremium &&
                                        "pointer-events-none"
                                    )}
                                  >
                                    <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Supports web search</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {model.supportsReasoning && (
                                <Tooltip>
                                  <TooltipTrigger
                                    className={cn(
                                      "w-6 h-6 p-1 rounded-full flex items-center justify-center",
                                      !isUserSubscribed && model.isPremium
                                        ? "pointer-events-none"
                                        : ""
                                    )}
                                  >
                                    <Brain className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Advanced reasoning capabilities</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!isUserSubscribed && model.isPremium && (
                        <p>
                          This model is only available to premium users.
                          <br />
                          <Button
                            variant="link"
                            onClick={handleUpgrade}
                            className="p-0 underline text-secondary hover:text-secondary/80"
                          >
                            Upgrade now
                          </Button>
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {filteredModels.length === 0 && (
                <div className="text-center py-12">
                  <p className="">
                    {activeTab === "favorites"
                      ? "No favorite models found."
                      : "No models found matching your criteria."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { cn } from "@/lib/utils";
import { useState } from "react";
import { GitBranch, RotateCw, FileText, Brain, ImageIcon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { getModelById } from "./model-selector";
import {
  Openai,
  Anthropic,
  DeepSeek,
  Grok,
  Gemini,
  Meta,
  Qwen,
} from "@/components/icons";
import { getEnabledModels } from "@/app/backend/lib/models";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { api } from "@/convex/_generated/api";

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

const providerIconMap = {
  OpenAI: <Openai className="w-4 h-4" />,
  Anthropic: <Anthropic className="w-4 h-4" />,
  DeepSeek: <DeepSeek className="w-4 h-4" />,
  xAI: <Grok className="w-4 h-4" />,
  Google: <Gemini className="w-4 h-4" />,
  Meta: <Meta className="w-4 h-4" />,
  Qwen: <Qwen className="w-4 h-4" />,
} as const;

interface UIModel {
  id: string;
  name: string;
  icon: React.ReactNode;
  isPremium: boolean;
  supportsImageUpload: boolean;
  supportsPdfUpload: boolean;
  supportsWebSearch: boolean;
  supportsReasoning: boolean;
}

interface ProviderGroup {
  icon: React.ReactNode;
  models: UIModel[];
}

// Get models from unified configuration and group by provider
const createModelsByProvider = (): Record<string, ProviderGroup> => {
  const enabledModels = getEnabledModels();
  const grouped: Record<string, ProviderGroup> = {};
  
  Object.entries(enabledModels).forEach(([id, config]) => {
    if (!grouped[config.provider]) {
      grouped[config.provider] = {
        icon: providerIconMap[config.provider as keyof typeof providerIconMap] || providerIconMap.OpenAI,
        models: [],
      };
    }
    
    grouped[config.provider].models.push({
      id,
      name: config.title,
      icon: iconMap[config.iconName as keyof typeof iconMap] || iconMap.openai,
      isPremium: config.isPremium,
      supportsImageUpload: config.capabilities.supportsImageUpload,
      supportsPdfUpload: config.capabilities.supportsPdfUpload,
      supportsWebSearch: config.capabilities.supportsWebSearch,
      supportsReasoning: config.capabilities.supportsReasoning,
    });
  });
  
  return grouped;
};

const modelsByProvider = createModelsByProvider();

type ActionType = "branch" | "regenerate";

interface ModelActionDropdownProps {
  actionType: ActionType;
  currentModelId: string;
  onAction: (modelId?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasImages?: boolean;
}

export default function ModelActionDropdown({
  actionType,
  currentModelId,
  onAction,
  isLoading,
  disabled = false,
  onOpenChange,
  hasImages = false,
}: ModelActionDropdownProps) {
  const [, setIsDropdownOpen] = useState(false);
  const isUserSubscribed = useSessionQuery(api.users.isUserSubscribed);
  
  const currentModel = getModelById(currentModelId);
  
  const actionConfig = {
    branch: {
      icon: GitBranch,
      label: "Try Again",
      title: "Create new thread with alternative response",
    },
    regenerate: {
      icon: RotateCw,
      label: "Re-generate",
      title: "Replace current response",
    },
  };
  
  const config = actionConfig[actionType];
  const ActionIcon = config.icon;

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    onOpenChange?.(open);
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isLoading || disabled}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-1"
          title={config.title}
        >
          <ActionIcon className={cn("h-4 w-4", isLoading && (actionType === "regenerate" ? "animate-spin" : "animate-pulse"))} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 z-30">
        <DropdownMenuLabel className="flex items-center gap-2">
          <ActionIcon className="w-4 h-4" />
          {config.label}
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => onAction()}>
          <div className="flex items-center gap-2 w-full">
            {currentModel?.icon && (
              <span className="w-5 h-5 flex items-center justify-center">
                {currentModel.icon}
              </span>
            )}
            {currentModel && (
              <span className="text-sm">
                {currentModel.name}
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {actionType === "branch" ? "(Previous)" : "(Same)"}
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          or switch model
        </div>
        
        {Object.entries(modelsByProvider).map(([providerName, providerData]) => {
          // For regenerate, show all models including current one
          // For branch, filter out the current model
          let availableModels = actionType === "regenerate" 
            ? providerData.models.filter(model => model.id !== currentModelId)
            : providerData.models.filter(model => model.id !== currentModelId);
          
          // Filter out models that don't support image upload if message has images
          if (hasImages && actionType === "regenerate") {
            availableModels = availableModels.filter(model => model.supportsImageUpload);
          }
          
          // Don't show provider if no models available
          if (availableModels.length === 0) return null;
          
          return (
            <DropdownMenuSub key={providerName}>
              <DropdownMenuSubTrigger>
                <div className="flex items-center gap-2">
                  {providerData.icon}
                  <span title={providerName}>{providerName}</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                {availableModels.map((model) => (
                  <DropdownMenuItem 
                    key={model.id} 
                    onClick={() => {
                      if (!isUserSubscribed && model.isPremium) return;
                      onAction(model.id);
                    }}
                    className={cn(
                      "p-3 cursor-pointer relative",
                      !isUserSubscribed && model.isPremium && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-shrink-0 mt-0.5 flex flex-col items-center gap-1">
                        {model.icon}
                      </div>
                      <div className="flex justify-between items-center flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm mb-1" title={model.name}>
                          {model.name}
                        </h3>

                        {/* Capability icons */}
                        <div className="flex gap-1">
                        {model.isPremium && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0.5 pointer-events-none"
                          >
                            Pro
                          </Badge>
                        )}

                          {model.supportsImageUpload && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-5 h-5 p-1 rounded-full flex items-center justify-center">
                                  <ImageIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supports image upload</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.supportsPdfUpload && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-5 h-5 p-1 rounded-full flex items-center justify-center">
                                  <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supports PDF upload</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.supportsWebSearch && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-5 h-5 p-1 rounded-full flex items-center justify-center">
                                  <Globe className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supports web search</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.supportsReasoning && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-5 h-5 p-1 rounded-full flex items-center justify-center">
                                  <Brain className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Advanced reasoning capabilities</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
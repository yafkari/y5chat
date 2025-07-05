"use client";

import { useParams, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  LogOut,
  Crown,
  Settings,
  History,
  Key,
  Paperclip,
  Mail,
  Palette,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

const tabs = [
  { id: "account", label: "Account", icon: Settings },
  // { id: "customization", label: "Customization", icon: Palette },
  // { id: "history", label: "History & Sync", icon: History },
  // { id: "models", label: "Models", icon: Crown },
  // { id: "api-keys", label: "API Keys", icon: Key },
  // { id: "attachments", label: "Attachments", icon: Paperclip },
  // { id: "contact", label: "Contact Us", icon: Mail },
];

export default function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthActions();
  
  // Try to get user from navigation state first, fallback to query
  const passedUser = location.state?.user;
  const queriedUser = useSessionQuery(api.users.getCurrentUser);
  const currentUser = passedUser || queriedUser;
  
  const payAction = useAction(api.stripe.pay);

  const activeTab = tab || "account";
  const isPro =
    currentUser?.subscriptionId &&
    (currentUser?.subscriptionEndsOn ?? 0) > Date.now();

  const handleUpgrade = async () => {
    try {
      const url = await payAction();
      window.location.href = url;
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/chat");
  };

  const getResetTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMessagesRemaining = () => {
    const chatCount = currentUser?.chatCount || 0;
    const totalMessages = isPro ? 1500 : 20;
    return Math.max(0, totalMessages - (20 - chatCount));
  };

  const getUsagePercentage = () => {
    const totalMessages = isPro ? 1500 : 20;
    const remaining = getMessagesRemaining();
    return ((totalMessages - remaining) / totalMessages) * 100;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen dark:bg-[#1A1A1A] dark:text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#1A1A1A] dark:text-gray-100">
      {/* Header */}
      <div className="">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/chat")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <div className="w-80 space-y-6">
            {/* User Profile */}
            <Card className="dark:bg-background">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-20 h-20 bg-primary">
                    <AvatarImage
                      src={currentUser.image}
                      alt={currentUser.name}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {getUserInitials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {currentUser.name || "User"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {currentUser.email}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {isPro ? "Pro Plan" : "Free Plan"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Usage */}
            <Card className="dark:bg-background">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Message Usage
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Resets tomorrow at {getResetTime()}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Standard</span>
                    <span className="font-medium">
                      {isPro
                        ? Math.floor((getUsagePercentage() / 100) * 1500)
                        : 20 - (currentUser.chatCount || 0)}
                      /{isPro ? 1500 : 20}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage()}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {getMessagesRemaining()} messages remaining
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex gap-1 text-sm">
                      <Info className="size-5" />
                      Messages which invoke tools (e.g. search, reasoning) may
                      consume additional message credits.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <Card className="dark:bg-background">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Search</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      Ctrl
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      K
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">New Chat</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      Ctrl
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      Shift
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      O
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Toggle Sidebar</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      Ctrl
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      B
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-8">
              {tabs.map((tabItem) => {
                const Icon = tabItem.icon;
                return (
                  <Button
                    key={tabItem.id}
                    variant={activeTab === tabItem.id ? "default" : "ghost"}
                    onClick={() => navigate(`/settings/${tabItem.id}`)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full",
                      activeTab === tabItem.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tabItem.label}
                  </Button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="space-y-8">
              {activeTab === "account" && (
                <>
                  {/* Upgrade to Pro */}
                  {!isPro && (
                    <div>
                      <div className="pb-">
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-semibold mb-2">
                              Upgrade to Pro
                            </h2>
                            <div className="text-right">
                              <span className="text-3xl font-bold">$10</span>
                              <span className="text-muted-foreground">
                                /month
                              </span>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-6 pb-16">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Crown className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="font-semibold">
                                  Access to All Models
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Get access to our full suite of models including
                                GPT-4, DeepSeek R1, Gemini 2.5 Pro, and more!
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Settings className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="font-semibold">
                                  Generous Limits
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Receive{" "}
                                <span className="font-semibold">
                                  1000 standard credits
                                </span>{" "}
                                per month, plus{" "}
                                <span className="font-semibold">
                                  100 premium credits
                                </span>
                                * per month.
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Mail className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="font-semibold">
                                  Priority Support
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Get faster responses and dedicated assistance
                                from the Y5 team whenever you need help!
                              </p>
                            </div>
                          </div>

                          <Button
                            onClick={handleUpgrade}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
                            size="lg"
                          >
                            Upgrade Now
                          </Button>

                          <p className="text-xs text-muted-foreground">
                            * Premium credits are used for Image Generation with
                            GPT models, o3, Claude Sonnet, Gemini 2.5 Pro, and
                            Grok 3. Additional Premium credits can be purchased
                            separately for $10 per 100.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Danger Zone */}
                  {/* <div className="pt-16">
                    <div className="pb-8">
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-destructive">
                          Danger Zone
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated
                          data.
                        </p>
                        <Button
                          variant="destructive"
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div> */}
                </>
              )}

              {activeTab === "customization" && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center py-12">
                      <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Customization
                      </h3>
                      <p className="text-muted-foreground">
                        Customize your chat experience with themes, fonts, and
                        more.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "history" && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        History & Sync
                      </h3>
                      <p className="text-muted-foreground">
                        Manage your chat history and synchronization settings.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "models" && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center py-12">
                      <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Models</h3>
                      <p className="text-muted-foreground">
                        Configure your preferred AI models and their settings.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "api-keys" && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center py-12">
                      <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">API Keys</h3>
                      <p className="text-muted-foreground">
                        Manage your API keys and integrations.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "attachments" && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center py-12">
                      <Paperclip className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Attachments
                      </h3>
                      <p className="text-muted-foreground">
                        Manage your uploaded files and attachments.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "contact" && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center py-12">
                      <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
                      <p className="text-muted-foreground">
                        Get in touch with our support team for help and
                        feedback.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

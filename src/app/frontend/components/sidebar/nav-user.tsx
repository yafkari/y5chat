"use client";

import {
  LogOut,
  Sparkles,
  LogInIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSessionQuery } from "convex-helpers/react/sessions";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAction } from "convex/react";
import { useNavigate } from "react-router";

export function NavUser() {
  const { isMobile } = useSidebar();
  const user = useSessionQuery(api.users.getCurrentUser);
  const { signIn, signOut } = useAuthActions();
  const navigate = useNavigate();
  const { open } = useSidebar();

  console.log("user", user);

  const payAction = useAction(api.stripe.pay);

  const handleUpgrade = async () => {
    if (!user?._id) {
      console.error("No ID available");
      return;
    }

    try {
      const url = await payAction();
      window.location.href = url;
    } catch (error) {
      console.error("Subscription failed:", error);
    }
  };

  const handleSignIn = async () => {
    console.log("handleSignIn");
    console.log(window.location.origin);
    await signIn("google", {
      redirectTo: `/chat`,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/chat");
  };

  if (user === undefined) {
    return (
      <div className="flex gap-2 opacity-50">
        <div className="w-2/12 animate-pulse duration-75 bg-gray-200 dark:bg-primary/20 rounded-md h-10"></div>
        <div className="w-10/12 animate-pulse duration-75 bg-gray-200 dark:bg-primary/20 rounded-md h-10"></div>
      </div>
    );
  }

  if (user === null || user.type === "anonymous") {
    return (
      <Button
        className="flex w-full select-none items-center gap-4 rounded-lg p-4 py-6"
        onClick={handleSignIn}
      >
        <LogInIcon className="w-5 h-5" /> {open && <span>Log in</span>}
      </Button>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs capitalize">
                  {user.subscriptionId ? "Pro" : "Free"}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {user === null ? (
              <DropdownMenuItem>
                <LogInIcon />
                {open ? "Log in" : ""}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback className="rounded-lg">
                        {user.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                {!user.subscriptionId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={handleUpgrade}>
                        <Sparkles />
                        Upgrade to Pro
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
                {/* <DropdownMenuSeparator /> */}
                {/* <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

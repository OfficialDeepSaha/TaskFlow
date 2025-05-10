import { Search, Menu, X, Sun, Moon, User, Settings, LogOut } from "lucide-react";
import { NotificationCenter } from "@/components/notification-center";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavbarProps {
  title: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onSearch?: (searchTerm: string) => void;
}

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/tasks": "My Tasks",
  "/assigned": "Tasks Assigned to Me",
  "/created": "Tasks Created by Me",
  "/overdue": "Overdue Tasks",
};

export function Navbar({ title, sidebarOpen, setSidebarOpen, onSearch }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logoutMutation } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, navigate] = useLocation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Notifications completely removed

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 backdrop-blur-sm bg-opacity-90 z-40 transition-all duration-200">
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none lg:hidden
                      transition-transform duration-200 hover:bg-accent/50"
                  >
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {sidebarOpen ? "Close sidebar" : "Open sidebar"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="ml-4 lg:ml-0 flex items-center">
              <div className="w-6 h-6 rounded-md bg-primary/90 mr-2 hidden md:flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">T</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {title || titles[location] || "TaskFlow"}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-4 w-4 ${isSearchFocused ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
              </div>
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`pl-10 pr-3 py-2 w-56 lg:w-72 border-muted transition-all duration-200
                  ${isSearchFocused ? 'border-primary ring-1 ring-primary/20' : 'hover:border-border'}`}
              />
            </form>

            {/* Notification Center */}
            <div className="animate-in fade-in duration-500">
              <NotificationCenter />
            </div>
            
            {/* Theme Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="border-muted text-muted-foreground hover:text-foreground transition-all duration-200
                      hover:border-border"
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    ) : (
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Switch to {theme === "dark" ? "light" : "dark"} mode
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center space-x-2 group p-1 hover:bg-accent/50">
                  <Avatar className="h-8 w-8 border-2 border-border group-hover:border-primary transition-colors duration-200">
                    <AvatarFallback className={getAvatarColor(user?.name || 'User')}>
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block text-sm font-medium">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

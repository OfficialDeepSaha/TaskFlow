import { Search, Menu, X, Sun, Moon } from "lucide-react";
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
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";

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
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 dark:text-gray-300 focus:outline-none lg:hidden"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
            <div className="ml-4 lg:ml-0">
              <h1 className="text-xl font-semibold">{title || titles[location] || "TaskFlow"}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-56 lg:w-72"
              />
            </form>

            {/* Notification Center */}
            <NotificationCenter />
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-gray-500 dark:text-gray-300"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user ? getInitials(user.name) : "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block text-sm font-medium">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

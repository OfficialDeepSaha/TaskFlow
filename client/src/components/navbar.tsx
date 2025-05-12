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
import { useState, useRef, useEffect } from "react";
import { searchTasks } from "@/services/taskSearchService";
import { Task } from "@shared/schema";
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
  const debouncedSearchRef = useRef<NodeJS.Timeout>();
  const [location, navigate] = useLocation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Notifications completely removed

  // Handle search input changes with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }
    
    if (value.trim().length >= 1) {
      setIsSearching(true);
      // Set a new timeout to call search API after debounce
      debouncedSearchRef.current = setTimeout(async () => {
        try {
          const results = await searchTasks(value);
          setSearchResults(results);
          setShowSearchResults(true);
        } catch (error) {
          console.error('Error searching tasks:', error);
        } finally {
          setIsSearching(false);
        }
        
        // Also call original onSearch prop if provided
        if (onSearch) {
          onSearch(value);
        }
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      
      // Call onSearch with empty string
      if (onSearch) {
        onSearch('');
      }
    }
  };
  
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
            <div className="relative hidden md:block">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`h-4 w-4 ${isSearchFocused ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-200`} />
                </div>
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    setIsSearchFocused(false);
                    // Delay hiding search results to allow clicking on them
                    setTimeout(() => setShowSearchResults(false), 200);
                  }}
                  className={`pl-10 pr-3 py-2 w-56 lg:w-72 border-muted transition-all duration-200
                    ${isSearchFocused ? 'border-primary ring-1 ring-primary/20' : 'hover:border-border'}`}
                  aria-label="Search tasks"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full"></div>
                  </div>
                )}
              </form>
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchTerm.trim() !== '' && (
                <div className="absolute mt-1 w-full bg-popover shadow-md rounded-md border border-border z-50 max-h-80 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((task) => (
                        <li key={task.id} className="px-4 py-2 hover:bg-accent cursor-pointer" 
                            onClick={() => {
                              // Navigate to task details page using the new route pattern
                              navigate(`/task-view/${task.id}`);
                              setShowSearchResults(false);
                            }}>
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {task.description.length > 60
                                ? `${task.description.substring(0, 60)}...`
                                : task.description}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      No tasks found matching "{searchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Center */}
            <div className="animate-in fade-in duration-500">
              <NotificationCenter />
            </div>
            
            {/* Theme Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={`relative overflow-hidden transition-all duration-300 ease-in-out ${theme === "dark" 
                      ? 'bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-amber-300 hover:text-amber-200 border border-indigo-600/30 hover:border-indigo-500/50 shadow-inner shadow-indigo-500/10' 
                      : 'bg-gradient-to-br from-amber-200/80 to-amber-400/80 text-indigo-700 hover:text-indigo-900 border border-amber-300 hover:border-amber-400 shadow shadow-amber-200/50'}`}
                    aria-label="Toggle theme"
                  >
                    <div className="relative flex items-center justify-center gap-2 z-10">
                      {theme === "dark" ? (
                        <>
                          <Sun className="h-4 w-4 animate-spin-slow" />
                          <span className="text-xs font-medium">Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="h-4 w-4 animate-pulse" />
                          <span className="text-xs font-medium">Dark Mode</span>
                        </>
                      )}
                    </div>
                    <div className={`absolute inset-0 opacity-20 ${theme === "dark" 
                      ? 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-yellow-300 via-amber-200 to-transparent' 
                      : 'bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-transparent'}`}>
                    </div>
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
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4" />
                  <span>Profile</span>
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

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  UserCheck,
  UserPlus,
  Clock,
  Users,
  LogOut,
  CheckSquareIcon,
  BarChart3,
  Settings,
  Shield,
  CalendarClock,
  PieChart,
  FileBarChart,
  Activity,
  Gauge,
  Bell,
  Layers,
  Star,
  BadgeHelp,
  Cog,
  Calendar,
  Briefcase,
  Boxes,
  Folder,
  FolderClosed,
  FolderOpen,
  Archive,
  Mail
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { logoutMutation, user } = useAuth();
  const { theme } = useTheme();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  // Use different background for dark/light mode
  const sidebarBg = theme === "dark" 
    ? "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950" 
    : "bg-gradient-to-b from-white via-white to-gray-50";

  const isAdmin = user?.role === "admin";
  const isOnAdminPage = location.startsWith('/admin');

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: isOpen ? 0 : -320 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-72 shadow-xl lg:shadow-none lg:static lg:inset-0 lg:translate-x-0",
        sidebarBg,
        "border-r border-border/40 backdrop-blur-sm"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-md bg-primary/90 flex items-center justify-center">
              <CheckSquareIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              TaskFlow
            </span>
            {isAdmin && (
              <Badge variant="secondary" className="ml-1 text-xs font-semibold uppercase">Admin</Badge>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus:outline-none lg:hidden"
          >
            <span className="sr-only">Close sidebar</span>
            <Layers className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-4 py-2">
          {isAdmin && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3 px-2 py-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20 ring-2 ring-background">
                    <AvatarFallback className={getAvatarColor(user?.name || 'User')}>
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user?.name || 'Admin User'}</p>
                    <p className="text-xs text-muted-foreground">Administrator</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 mb-4">
                <Button variant="outline" size="sm" className="h-9 text-xs">Profile</Button>
                <Button variant="outline" size="sm" className="h-9 text-xs">Settings</Button>
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleLogout}>Logout</Button>
              </div>
            </motion.div>
          )}

          <div className="space-y-1">
            <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dashboard
            </p>
            
            <Link href="/dashboard" onClick={closeOnMobile}>
              <a
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  (location === "/" || location === "/dashboard") 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground"
                )}
              >
                <LayoutDashboard className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>Overview</span>
              </a>
            </Link>
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin Tools
              </p>
              
              <Link href="/admin" onClick={closeOnMobile}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                    "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                    location === "/admin" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground"
                  )}
                >
                  <Gauge className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                  <span>Admin Dashboard</span>
                </a>
              </Link>
              
              <Link href="/admin/analytics" onClick={closeOnMobile}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                    "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                    location === "/admin/analytics" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground"
                  )}
                >
                  <BarChart3 className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                  <span>Analytics</span>
                </a>
              </Link>
              
              <Link href="/admin/team" onClick={closeOnMobile}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                    "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                    location === "/admin/team" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground"
                  )}
                >
                  <Users className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                  <span>Team Management</span>
                </a>
              </Link>
              
              <Link href="/admin/reports" onClick={closeOnMobile}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                    "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                    location === "/admin/reports" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground"
                  )}
                >
                  <FileBarChart className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                  <span>Reports</span>
                </a>
              </Link>
              
              <Link href="/admin/settings" onClick={closeOnMobile}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                    "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                    location === "/admin/settings" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground"
                  )}
                >
                  <Settings className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                  <span>System Settings</span>
                </a>
              </Link>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tasks
            </p>
            
            <Link href="/tasks" onClick={closeOnMobile}>
              <a
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  location === "/tasks" 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground"
                )}
              >
                <CheckSquare className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>All Tasks</span>
              </a>
            </Link>
            
            <Link href="/assigned" onClick={closeOnMobile}>
              <a
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  location === "/assigned" 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground"
                )}
              >
                <UserCheck className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>Assigned To Me</span>
                {isAdmin && !isOnAdminPage && (
                  <Badge className="ml-auto bg-primary/20 text-primary hover:bg-primary/30 transition-colors">5</Badge>
                )}
              </a>
            </Link>
            
            <Link href="/created" onClick={closeOnMobile}>
              <a
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  location === "/created" 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground"
                )}
              >
                <UserPlus className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>Created by Me</span>
              </a>
            </Link>
            
            <Link href="/overdue" onClick={closeOnMobile}>
              <a
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  location === "/overdue" 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground"
                )}
              >
                <Clock className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>Overdue Tasks</span>
                {isAdmin && !isOnAdminPage && (
                  <Badge variant="destructive" className="ml-auto">3</Badge>
                )}
              </a>
            </Link>
            
            {isAdmin && (
              <>
                <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects
                </p>
                
                {['Website Redesign', 'Mobile App', 'API Integration'].map((project, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                      "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                      "text-muted-foreground"
                    )}
                  >
                    <FolderClosed className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                    <span>{project}</span>
                    <Badge className="ml-auto bg-accent/50 text-muted-foreground hover:bg-accent/60 transition-colors">{index + 3}</Badge>
                  </div>
                ))}
              </>
            )}
          </div>
          
          {isAdmin && (
            <div className="space-y-1">
              <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Calendar
              </p>
              
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  "text-muted-foreground"
                )}
              >
                <Calendar className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>Schedule</span>
              </div>
              
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200",
                  "hover:bg-accent/50 hover:text-foreground group cursor-pointer",
                  "text-muted-foreground"
                )}
              >
                <Bell className="mr-3 h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                <span>Reminders</span>
              </div>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-border/40 mt-auto">
          {!isAdmin ? (
            <Button
              variant="outline" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </Button>
          ) : (
            <div className="bg-accent/30 rounded-lg p-3 text-xs text-center">
              <div className="text-muted-foreground mb-2">Need help with the dashboard?</div>
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                <BadgeHelp className="mr-1 h-3 w-3" /> View Help Docs
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

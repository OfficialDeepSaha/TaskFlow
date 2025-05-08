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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 transition duration-300 transform bg-white dark:bg-gray-800 shadow-lg lg:static lg:inset-0 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CheckSquareIcon className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">TaskFlow</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-gray-500 hover:text-gray-600 focus:outline-none lg:hidden"
        >
          <span className="sr-only">Close sidebar</span>
          <LayoutDashboard className="h-6 w-6" />
        </button>
      </div>

      <nav className="p-4">
        <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase">Main</p>
        
        <Link href="/dashboard" onClick={closeOnMobile}>
          <a
            className={cn(
              "flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
              (location === "/" || location === "/dashboard") &&
                "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
            )}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            <span>Dashboard</span>
          </a>
        </Link>
        
        <Link href="/tasks" onClick={closeOnMobile}>
          <a
            className={cn(
              "flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
              location === "/tasks" &&
                "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
            )}
          >
            <CheckSquare className="mr-3 h-5 w-5" />
            <span>My Tasks</span>
          </a>
        </Link>
        
        <Link href="/assigned" onClick={closeOnMobile}>
          <a
            className={cn(
              "flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
              location === "/assigned" &&
                "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
            )}
          >
            <UserCheck className="mr-3 h-5 w-5" />
            <span>Assigned to Me</span>
          </a>
        </Link>
        
        <Link href="/created" onClick={closeOnMobile}>
          <a
            className={cn(
              "flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
              location === "/created" &&
                "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
            )}
          >
            <UserPlus className="mr-3 h-5 w-5" />
            <span>Created by Me</span>
          </a>
        </Link>
        
        <Link href="/overdue" onClick={closeOnMobile}>
          <a
            className={cn(
              "flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
              location === "/overdue" &&
                "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
            )}
          >
            <Clock className="mr-3 h-5 w-5" />
            <span>Overdue</span>
          </a>
        </Link>
        
        <p className="px-4 pt-6 pb-2 text-xs font-semibold text-gray-400 uppercase">Team</p>
        
        <a
          className={cn(
            "flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          )}
        >
          <Users className="mr-3 h-5 w-5" />
          <span>Team Members</span>
        </a>
        
        <div className="pt-6">
          <a
            onClick={handleLogout}
            className="flex items-center px-4 py-2 mt-1 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Logout</span>
          </a>
        </div>
      </nav>
    </div>
  );
}

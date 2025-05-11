import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, normalizeApiUrl } from "@/lib/queryClient";
import { RefreshCw, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";

// Types for activity data
interface Activity {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  userAvatar: string | null;
  entityId: number;
  entityType: string;
  action: string;
  message: string;
  details: Record<string, any>;
}

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  // Format as date for older activities
  return date.toLocaleDateString();
}

// Badge color based on activity action
function getActionColor(action: string): string {
  switch (action) {
    case 'created':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'deleted':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'updated':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'assigned':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'status_changed':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

// Custom hook for fetching activities
export function useRecentActivities(limit = 10, autoRefreshInterval = 30000) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const { toast } = useToast();
  
  // Function to fetch activities from API
  const fetchActivities = async (showToast = false) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('GET', `/api/activities?limit=${limit}`, undefined, 5000);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      
      const data = await response.json();
      setActivities(data);
      setLastRefreshed(new Date());
      setIsError(false);
      
      if (showToast) {
        toast({
          title: "Activities refreshed",
          description: `Loaded ${data.length} recent activities`,
        });
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setIsError(true);
      
      if (showToast) {
        toast({
          title: "Error refreshing activities",
          description: "Could not load activity data. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchActivities();
    
    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      fetchActivities();
    }, autoRefreshInterval);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [limit, autoRefreshInterval]);
  
  return {
    activities,
    isLoading,
    isError,
    lastRefreshed,
    refresh: (showToast = true) => fetchActivities(showToast),
  };
}

// Activity list item component with animations
const ActivityItem = ({ activity }: { activity: Activity }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="flex items-start space-x-4 p-3 border-b last:border-b-0 border-border/40 group hover:bg-accent/5 transition-colors"
    >
      <Avatar className="w-10 h-10 border border-border">
        <AvatarImage src={activity.userAvatar || undefined} alt={activity.userName} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          {activity.userName.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium truncate">{activity.userName}</p>
          <div className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3 opacity-70" />
            {formatRelativeTime(activity.timestamp)}
          </div>
        </div>
        
        <p className="text-sm text-foreground/90 leading-tight">{activity.message}</p>
        
        <div className="flex items-center pt-1">
          <Badge 
            variant="outline" 
            className={`text-xs font-normal ${getActionColor(activity.action)}`}
          >
            {activity.action.replace('_', ' ')}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
};

// Loading skeleton component
const ActivitySkeleton = () => (
  <div className="flex items-start space-x-4 p-3 border-b border-border/40">
    <Skeleton className="w-10 h-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-3 w-[80px]" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-[60px]" />
    </div>
  </div>
);

// Main RecentActivities component
export function RecentActivities() {
  const { activities, isLoading, isError, lastRefreshed, refresh } = useRecentActivities(10);
  
  return (
    <Card className="bg-card/60 backdrop-blur-lg border-border/50 shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refresh()} 
            disabled={isLoading}
            className="h-8 gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
        {isError ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <p>Could not load activity data.</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refresh()} 
              className="mt-2"
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border/40">
            <AnimatePresence>
              {isLoading && activities.length === 0 ? (
                // Show skeletons during initial load
                Array.from({ length: 5 }).map((_, i) => (
                  <ActivitySkeleton key={i} />
                ))
              ) : activities.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <p>No recent activities found.</p>
                </div>
              ) : (
                // Show actual activities
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

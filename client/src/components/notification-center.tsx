import React, { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket, WebSocketNotification } from '@/lib/websocket';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

export function NotificationCenter() {
  const { user } = useAuth();
  const { notifications } = useWebSocket(user?.id || null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<WebSocketNotification[]>([]);
  
  // Update unread count and local notifications when notifications change
  useEffect(() => {
    if (notifications.length > 0) {
      setUnreadCount(prev => prev + (notifications.length - localNotifications.length));
      setLocalNotifications(notifications);
    }
  }, [notifications]);
  
  // Mark all as read
  const markAllAsRead = () => {
    setUnreadCount(0);
  };
  
  // Handle opening the notification panel
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setUnreadCount(0);
    }
  };
  
  // Render notification item
  const renderNotificationItem = (notification: WebSocketNotification, index: number) => {
    const isNew = index < unreadCount;
    
    return (
      <motion.div
        key={`${notification.type}-${notification.taskId}-${notification.timestamp}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "p-3 border-b border-gray-100 dark:border-gray-700 last:border-0",
          isNew && "bg-blue-50 dark:bg-blue-900/20"
        )}
      >
        <div className="flex items-start gap-3">
          {getNotificationIcon(notification)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {getNotificationTitle(notification)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatTime(notification.timestamp)}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };
  
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <Badge 
                variant="destructive" 
                className="h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 max-h-[70vh] flex flex-col"
        align="end"
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold">Notifications</h3>
          {localNotifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          <AnimatePresence>
            {localNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                No notifications yet
              </div>
            ) : (
              localNotifications.slice(0, 20).map(renderNotificationItem)
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to get notification icon
function getNotificationIcon(notification: WebSocketNotification) {
  switch (notification.type) {
    case 'task_assigned':
      return (
        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      );
    case 'task_updated':
      return (
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
      );
    case 'task_completed':
      return (
        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
      );
  }
}

// Helper function to get notification title
function getNotificationTitle(notification: WebSocketNotification): string {
  switch (notification.type) {
    case 'task_assigned':
      return `New Task: ${notification.taskTitle}`;
    case 'task_updated':
      return `Task Updated: ${notification.taskTitle}`;
    case 'task_completed':
      return `Task Completed: ${notification.taskTitle}`;
    default:
      return 'Notification';
  }
}

// Helper function to format timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than a minute ago
  if (diff < 60 * 1000) {
    return 'Just now';
  }
  
  // If less than an hour ago
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // If less than a day ago
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // If less than a week ago
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  // Otherwise, show the date
  return date.toLocaleDateString();
}

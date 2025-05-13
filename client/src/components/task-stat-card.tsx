import React, { useState, useEffect } from 'react';
import { TaskStatus } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { normalizeApiUrl } from '@/lib/queryClient';
import { RefreshCcw } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

interface TaskStatCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  statType: 'assigned' | 'completed' | 'in_progress' | 'not_started';
  description: string;
  delay?: number;
}

export function TaskStatCard({ 
  title, 
  icon,
  iconColor, 
  statType, 
  description,
  delay = 0.1
}: TaskStatCardProps) {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTaskStat = async () => {
    if (!user) return 0;
    
    try {
      setIsLoading(true);
      console.log(`Fetching ${statType} tasks count for user:`, user.id);
      
      const response = await fetch(normalizeApiUrl('/api/tasks/assigned/me'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received task data for ${statType}:`, data);
      
      // Filter tasks by the requested status
      let filteredCount = 0;
      
      if (statType === 'assigned') {
        filteredCount = Array.isArray(data) ? data.length : 0;
      } else {
        const statusMap = {
          'completed': TaskStatus.COMPLETED,
          'in_progress': TaskStatus.IN_PROGRESS,
          'not_started': TaskStatus.NOT_STARTED
        };
        
        const status = statusMap[statType as keyof typeof statusMap];
        filteredCount = Array.isArray(data) 
          ? data.filter(task => task.status === status).length 
          : 0;
      }
      
      console.log(`Filtered ${statType} count:`, filteredCount);
      setCount(filteredCount);
      return filteredCount;
    } catch (error) {
      console.error(`Error fetching ${statType} tasks:`, error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Fetch on component mount
    fetchTaskStat();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(() => {
      fetchTaskStat();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [user, statType]);
  
  // CSS class mapping
  const colorClasses = {
    blue: {
      bg: 'from-blue-50/40 via-blue-50/20 to-transparent dark:from-blue-950/30 dark:via-blue-900/10 dark:to-transparent',
      innerBg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      textMuted: 'text-blue-700/70 dark:text-blue-300/70',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      border: 'border-blue-400',
    },
    green: {
      bg: 'from-green-50/40 via-green-50/20 to-transparent dark:from-green-950/30 dark:via-green-900/10 dark:to-transparent',
      innerBg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      textMuted: 'text-green-700/70 dark:text-green-300/70',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      border: 'border-green-400',
    },
    amber: {
      bg: 'from-amber-50/40 via-amber-50/20 to-transparent dark:from-amber-950/30 dark:via-amber-900/10 dark:to-transparent',
      innerBg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-600 dark:text-amber-400',
      textMuted: 'text-amber-700/70 dark:text-amber-300/70',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
      border: 'border-amber-400',
    },
    red: {
      bg: 'from-red-50/40 via-red-50/20 to-transparent dark:from-red-950/30 dark:via-red-900/10 dark:to-transparent',
      innerBg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      textMuted: 'text-red-700/70 dark:text-red-300/70',
      hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/30',
      border: 'border-red-400',
    }
  };
  
  const colors = colorClasses[iconColor as keyof typeof colorClasses];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className={`overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${colors.bg} backdrop-blur-sm`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium ${colors.textMuted} flex items-center justify-between`}>
            <div className="flex items-center">
              <div className={`${colors.innerBg} p-2 rounded-md mr-2`}>
                {React.cloneElement(icon as React.ReactElement, { 
                  className: `h-4 w-4 ${colors.text}` 
                })}
              </div>
              {title}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-6 w-6 rounded-full ${colors.hoverBg}`}
              onClick={() => fetchTaskStat()}
              disabled={isLoading}
            >
              <RefreshCcw className={`h-3 w-3 ${colors.text} ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <div className={`text-2xl sm:text-3xl font-bold ${colors.text}`}>
                {isLoading ? (
                  <div className={`animate-pulse h-8 w-8 rounded-full border-2 ${colors.border} border-t-transparent`}></div>
                ) : (
                  count
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-lg ${colors.innerBg} flex items-center justify-center shadow-inner`}>
              {React.cloneElement(icon as React.ReactElement, { 
                className: `h-5 w-5 ${colors.text}` 
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 
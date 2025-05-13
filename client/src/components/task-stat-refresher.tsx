import { useState, useEffect } from 'react';
import { TaskStatus } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { normalizeApiUrl } from '@/lib/queryClient';
import { RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';

interface TaskStatRefresherProps {
  statType: 'assigned' | 'completed' | 'in_progress' | 'not_started';
  color: string;
  onStatUpdate?: (count: number) => void;
}

export function TaskStatRefresher({ statType, color, onStatUpdate }: TaskStatRefresherProps) {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      
      if (onStatUpdate) {
        onStatUpdate(filteredCount);
      }
      
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
  
  return (
    <div className="flex items-center gap-2">
      <div className={`text-2xl sm:text-3xl font-bold text-${color}-600 dark:text-${color}-400`}>
        {isLoading ? (
          <div className={`animate-pulse h-8 w-8 rounded-full border-2 border-${color}-400 border-t-transparent`}></div>
        ) : (
          count
        )}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-6 w-6 rounded-full hover:bg-${color}-100 dark:hover:bg-${color}-900/30`}
        onClick={() => fetchTaskStat()}
        disabled={isLoading}
      >
        <RefreshCcw className={`h-3 w-3 text-${color}-600 dark:text-${color}-400 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
} 
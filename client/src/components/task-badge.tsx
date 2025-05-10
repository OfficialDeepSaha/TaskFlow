import { Badge } from "@/components/ui/badge";

interface TaskPriorityBadgeProps {
  priority: string;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const priorityClasses = {
    high: 'border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
    medium: 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    low: 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  };

  const classNames = `text-xs px-1.5 py-0 ${priorityClasses[priority as keyof typeof priorityClasses] || priorityClasses.medium}`;
  
  return (
    <Badge variant="outline" className={classNames}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
} 
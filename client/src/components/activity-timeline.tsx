import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, User } from "@shared/schema";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { CheckCircle, PlusCircle, UserCheck, ClockIcon } from "lucide-react";

interface ActivityItem {
  id: number;
  type: 'completed' | 'created' | 'assigned' | 'updated';
  task: Task;
  user: User;
  timestamp: Date;
  assignedTo?: User;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return (
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        );
      case 'created':
        return (
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
            <PlusCircle className="h-5 w-5 text-white" />
          </div>
        );
      case 'assigned':
        return (
          <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
            <UserCheck className="h-5 w-5 text-white" />
          </div>
        );
      case 'updated':
        return (
          <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
            <ClockIcon className="h-5 w-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
            <span className="h-5 w-5 text-white" />
          </div>
        );
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'completed':
        return `${activity.user.name} completed a task`;
      case 'created':
        return `${activity.user.name} created a new task`;
      case 'assigned':
        return `${activity.user.name} assigned a task to ${activity.assignedTo?.name || 'someone'}`;
      case 'updated':
        return `${activity.user.name} updated a task status`;
      default:
        return `${activity.user.name} did something`;
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'completed':
        return `Completed "${activity.task.title}"`;
      case 'created':
        return `Created "${activity.task.title}"`;
      case 'assigned':
        return `Assigned "${activity.task.title}" to ${activity.assignedTo?.name || 'someone'}`;
      case 'updated':
        return `Changed "${activity.task.title}" to "${activity.task.status.replace('_', ' ')}"`;
      default:
        return `Worked on "${activity.task.title}"`;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    
    return format(date, 'MMM d, yyyy');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.length === 0 ? (
              <li className="text-center py-6 text-gray-500 dark:text-gray-400">
                No recent activity
              </li>
            ) : (
              activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx < activities.length - 1 && (
                      <span
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getActivityText(activity)}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          <p>{getActivityDescription(activity)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        {activities.length > 0 && (
          <div className="mt-6 text-center">
            <Button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
              View all activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Button({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button className={className}>{children}</button>
  );
}

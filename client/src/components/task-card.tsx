import { Card, CardContent } from "@/components/ui/card";
import { Task, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  formatDate, 
  formatStatus, 
  getPriorityColor, 
  getStatusColor,
  getInitials,
  getAvatarColor
} from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  assignedUser?: User;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

export function TaskCard({ task, assignedUser, onEdit, onDelete }: TaskCardProps) {
  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date();
  
  return (
    <Card className="mb-4 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-md font-medium">{task.title}</h4>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap items-center mt-2 gap-2">
              <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </Badge>
              
              <Badge variant="secondary" className={getStatusColor(task.status)}>
                {formatStatus(task.status)}
              </Badge>
              
              {task.dueDate && (
                <span className={`text-xs ${isPastDue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Due: {formatDate(task.dueDate)}
                  {isPastDue && ' (Overdue)'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(task)} title="Edit">
              <Edit className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} title="Delete">
              <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>
          </div>
        </div>
        
        {assignedUser && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarFallback className={getAvatarColor(assignedUser.name)}>
                  {getInitials(assignedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span>Assigned to: {assignedUser.name}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Created {formatDate(task.createdAt)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

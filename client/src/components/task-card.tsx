import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Task, User, TaskColor } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Smile, ChevronDown, ChevronUp, Clock, CalendarClock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskMoodReactions } from "@/components/task-mood-reactions";
import { 
  formatDate, 
  formatStatus, 
  getPriorityColor, 
  getStatusColor,
  getInitials,
  getAvatarColor
} from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskCardProps {
  task: Task;
  assignedUser?: User;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

// Task color code mapping
const colorCodeClasses: Record<TaskColor, string> = {
  default: "border-l-gray-300 dark:border-l-gray-600 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-900/30",
  red: "border-l-red-500 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20",
  orange: "border-l-orange-500 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20",
  yellow: "border-l-yellow-500 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20",
  green: "border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20",
  blue: "border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20",
  purple: "border-l-purple-500 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20",
  pink: "border-l-pink-500 bg-gradient-to-r from-pink-50/50 to-transparent dark:from-pink-950/20"
};

export function TaskCard({ task, assignedUser, onEdit, onDelete }: TaskCardProps) {
  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date();
  const [showMoodReactions, setShowMoodReactions] = useState(false);
  
  // Use color code from task or default
  const colorClass = task.colorCode ? colorCodeClasses[task.colorCode as TaskColor] : colorCodeClasses.default;
  
  return (
    <Card className={`mb-4 border-gray-200 dark:border-gray-700 border-l-4 ${colorClass} 
      hover:shadow-md transition-all duration-200 group/card overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <h4 className="text-md font-medium group-hover/card:text-primary transition-colors duration-200">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 hover:line-clamp-none transition-all duration-200">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap items-center mt-2 gap-2">
              <Badge variant="secondary" className={`${getPriorityColor(task.priority)} transition-all duration-200`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </Badge>
              
              <Badge variant="secondary" className={`${getStatusColor(task.status)} transition-all duration-200`}>
                {formatStatus(task.status)}
              </Badge>
              
              {task.dueDate && (
                <span className={`text-xs flex items-center ${isPastDue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  <CalendarClock className="h-3 w-3 mr-1 inline-block" />
                  {formatDate(task.dueDate)}
                  {isPastDue && ' (Overdue)'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowMoodReactions(!showMoodReactions)} 
                    className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-accent"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add reaction</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(task)} 
                    className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-accent"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit task</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(task.id)} 
                    className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete task</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {assignedUser && (
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Avatar className="h-6 w-6 mr-2 ring-2 ring-background">
                <AvatarFallback className={getAvatarColor(assignedUser.name)}>
                  {getInitials(assignedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span className="opacity-75 hover:opacity-100 transition-opacity">
                {assignedUser.name}
              </span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1 inline-block" />
              {formatDate(task.createdAt)}
            </div>
          </div>
        )}
        
        {/* Mood Reactions Panel */}
        {showMoodReactions && (
          <div className="mt-4 border-t pt-3 animate-in slide-in-from-top duration-300">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-sm font-medium">Team Reactions</h5>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMoodReactions(false)}
                className="h-6 px-2"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
            <TaskMoodReactions task={task} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

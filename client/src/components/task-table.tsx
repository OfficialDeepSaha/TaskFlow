import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Trash2, 
  CheckCircle, 
  MoreHorizontal, 
  Clock, 
  XCircle, 
  CalendarDays,
  User as UserIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task, User, TaskStatus } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatDate,
  formatStatus,
  getPriorityColor,
  getStatusColor,
  getInitials,
  getAvatarColor,
} from "@/lib/utils";
import {
  Card,
  CardContent
} from "@/components/ui/card";

interface TaskTableProps {
  tasks: Task[];
  users: User[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  isUserRole?: boolean; // New prop to determine if user has regular user role
  onStatusChange?: (taskId: number, newStatus: string) => void; // For changing task status
}

export function TaskTable({ tasks, users, onEdit, onDelete, isUserRole = false, onStatusChange }: TaskTableProps) {
  const getUserById = (userId: number | null | undefined) => {
    if (!userId) return null;
    return users.find((user) => user.id === userId);
  };

  // Mobile view rendering
  const renderMobileTaskCard = (task: Task) => {
    const assignedUser = getUserById(task.assignedToId);
    const isPastDue = task.dueDate && new Date(task.dueDate) < new Date();
    
    return (
      <Card key={task.id} className="mb-4 overflow-hidden border-border/60">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Task title and status */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className={getStatusColor(task.status)}>
                {formatStatus(task.status)}
              </Badge>
            </div>
            
            {/* Task details */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
              <div className="flex items-center text-muted-foreground">
                <MoreHorizontal className="h-3 w-3 mr-1.5" />
                <span>Priority:</span>
              </div>
              <div>
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <UserIcon className="h-3 w-3 mr-1.5" />
                <span>Assigned to:</span>
              </div>
              <div>
                {assignedUser ? (
                  <div className="flex items-center">
                    <Avatar className="h-4 w-4 mr-1">
                      <AvatarFallback className={getAvatarColor(assignedUser.name)}>
                        {getInitials(assignedUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{assignedUser.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <CalendarDays className="h-3 w-3 mr-1.5" />
                <span>Due date:</span>
              </div>
              <div className={isPastDue ? "text-destructive" : ""}>
                {task.dueDate ? formatDate(task.dueDate) : "No date"}
                {isPastDue && " (Overdue)"}
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-2 flex justify-end">
              {isUserRole ? (
                // Status change dropdown for regular users
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      disabled={task.status === TaskStatus.NOT_STARTED}
                      onClick={() => onStatusChange && onStatusChange(task.id, TaskStatus.NOT_STARTED)}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-gray-500" /> Not Started
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled={task.status === TaskStatus.IN_PROGRESS}
                      onClick={() => onStatusChange && onStatusChange(task.id, TaskStatus.IN_PROGRESS)}
                    >
                      <Clock className="mr-2 h-4 w-4 text-blue-500" /> In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled={task.status === TaskStatus.COMPLETED}
                      onClick={() => onStatusChange && onStatusChange(task.id, TaskStatus.COMPLETED)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Completed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Admin actions
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(task)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onDelete(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-10 px-4 bg-muted/20 rounded-md">
      <XCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
      <h3 className="text-lg font-medium text-foreground mb-1">No tasks found</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {isUserRole 
          ? "You don't have any tasks assigned to you yet." 
          : "There are no tasks that match your criteria."}
      </p>
    </div>
  );

  return (
    <div>
      {/* Mobile view (card layout) */}
      <div className="md:hidden">
        {tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {tasks.map(task => renderMobileTaskCard(task))}
          </div>
        )}
      </div>

      {/* Desktop view (table layout) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[300px]">Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const assignedUser = getUserById(task.assignedToId);
                const isPastDue = task.dueDate && new Date(task.dueDate) < new Date();
                
                return (
                  <TableRow key={task.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground">
                            {task.description.length > 60
                              ? `${task.description.substring(0, 60)}...`
                              : task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(task.status)}>
                        {formatStatus(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignedUser ? (
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className={getAvatarColor(assignedUser.name)}>
                              {getInitials(assignedUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assignedUser.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          isPastDue ? "text-destructive" : "text-muted-foreground"
                        }
                      >
                        {task.dueDate ? formatDate(task.dueDate) : "No date"}
                        {isPastDue && " (Overdue)"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {isUserRole ? (
                        // Status change dropdown for regular users
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <span>Change Status</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              disabled={task.status === TaskStatus.NOT_STARTED}
                              onClick={() => onStatusChange && onStatusChange(task.id, TaskStatus.NOT_STARTED)}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-gray-500" /> Not Started
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              disabled={task.status === TaskStatus.IN_PROGRESS}
                              onClick={() => onStatusChange && onStatusChange(task.id, TaskStatus.IN_PROGRESS)}
                            >
                              <Clock className="mr-2 h-4 w-4 text-blue-500" /> In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              disabled={task.status === TaskStatus.COMPLETED}
                              onClick={() => onStatusChange && onStatusChange(task.id, TaskStatus.COMPLETED)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Completed
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        // Admin actions
                        <>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

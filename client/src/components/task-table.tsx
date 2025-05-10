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
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task, User } from "@shared/schema";
import {
  formatDate,
  formatStatus,
  getPriorityColor,
  getStatusColor,
  getInitials,
  getAvatarColor,
} from "@/lib/utils";

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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-700">
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
              <TableCell colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const assignedUser = getUserById(task.assignedToId);
              const isPastDue = task.dueDate && new Date(task.dueDate) < new Date();
              
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
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
                      <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isPastDue ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
                      }
                    >
                      {task.dueDate ? formatDate(task.dueDate) : "No date"}
                      {isPastDue && " (Overdue)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {isUserRole ? (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    ) : (
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
  );
}

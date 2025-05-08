import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isThisWeek, isThisMonth, isPast } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to display in UI
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "No date";
  return format(new Date(date), "MMM dd, yyyy");
}

// Get the relative due date status (Today, This Week, etc)
export function getDueDateStatus(date: Date | null | undefined): string {
  if (!date) return "No date";
  
  const dateObj = new Date(date);
  
  if (isToday(dateObj)) return "Today";
  if (isThisWeek(dateObj)) return "This week";
  if (isThisMonth(dateObj)) return "This month";
  if (isPast(dateObj)) return "Overdue";
  
  return formatDate(date);
}

// Get color class based on priority
export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900";
    case "medium":
      return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900";
    case "low":
      return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900";
    default:
      return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700";
  }
}

// Get color class based on status
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "in_progress":
      return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900";
    case "completed":
      return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900";
    case "not_started":
    default:
      return "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700";
  }
}

// Format status for display
export function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "not_started":
    default:
      return "Not Started";
  }
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Get a color based on a string (for user avatars)
export function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600",
    "bg-purple-600",
    "bg-green-600",
    "bg-indigo-600",
    "bg-red-600",
    "bg-amber-600",
    "bg-pink-600",
    "bg-teal-600",
  ];
  
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

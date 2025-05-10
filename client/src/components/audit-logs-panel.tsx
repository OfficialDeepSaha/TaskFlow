import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Loader2, ClipboardList, RefreshCw, Filter } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
// Define enums locally to avoid import issues
enum AuditAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
  ASSIGNED = "ASSIGNED",
  COMPLETED = "COMPLETED",
  STATUS_CHANGED = "STATUS_CHANGED"
}

enum AuditEntity {
  TASK = "TASK",
  USER = "USER"
}

// Format date with time utility function
function formatDateWithTime(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format the audit action into a more readable format
const formatAction = (action: string) => {
  return action
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Get badge styles based on audit action
const getActionBadgeStyles = (action: string): { variant: "secondary" | "destructive" | "outline" | "default"; className: string } => {
  switch (action) {
    case AuditAction.CREATED:
      return { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-200" };
    case AuditAction.UPDATED:
      return { variant: "secondary", className: "" };
    case AuditAction.DELETED:
      return { variant: "destructive", className: "" };
    case AuditAction.ASSIGNED:
      return { variant: "outline", className: "" };
    case AuditAction.COMPLETED:
      return { variant: "default", className: "bg-blue-100 text-blue-800 hover:bg-blue-200" };
    case AuditAction.STATUS_CHANGED:
      return { variant: "secondary", className: "" };
    default:
      return { variant: "default", className: "" };
  }
};

// Utility to format JSON data for display
const formatJsonData = (data: any) => {
  if (!data) return "No changes";
  try {
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    
    // Format changes in a readable way
    if (data.from !== undefined && data.to !== undefined) {
      return `${data.from || "None"} → ${data.to || "None"}`;
    }
    
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};

/**
 * Audit Logs Panel Component
 * Displays audit logs for tasks (admin only or filtered by user/task)
 */
export function AuditLogsPanel({ taskId, userId }: { taskId?: number; userId?: number }) {
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  // Determine the appropriate endpoint based on props
  const getEndpoint = () => {
    if (taskId) return `/api/tasks/${taskId}/audit-logs`;
    if (userId) return `/api/audit-logs/me`;
    return `/api/audit-logs`;
  };

  // Fetch audit logs
  const {
    data: auditLogs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs", taskId, userId, filter],
    queryFn: async () => {
      const response = await axios.get(getEndpoint());
      
      // Apply client-side filtering if needed
      let logs = response.data;
      
      if (filter !== "all") {
        logs = logs.filter((log: any) => log.action === filter);
      }
      
      if (activeTab !== "all" && !taskId) {
        logs = logs.filter((log: any) => log.entityType === activeTab);
      }
      
      return logs;
    },
  });

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setFilter(value);
  };

  // Get page title based on props
  const getTitle = () => {
    if (taskId) return "Task Audit History";
    if (userId) return "My Activity Log";
    return "System Audit Logs";
  };

  // Get description based on props
  const getDescription = () => {
    if (taskId) return "Track all changes made to this task";
    if (userId) return "Track all your activities in the system";
    return "Track all changes made throughout the system";
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {getTitle()}
          </CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {getTitle()}
          </CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">
            Error loading audit logs. Please try again.
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {getTitle()}
        </CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          {/* Only show tabs for system-wide view */}
          {!taskId && !userId && (
            <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-fit">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value={AuditEntity.TASK}>Tasks</TabsTrigger>
                <TabsTrigger value={AuditEntity.USER}>Users</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Action filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value={AuditAction.CREATED}>Created</SelectItem>
                <SelectItem value={AuditAction.UPDATED}>Updated</SelectItem>
                <SelectItem value={AuditAction.DELETED}>Deleted</SelectItem>
                <SelectItem value={AuditAction.ASSIGNED}>Assigned</SelectItem>
                <SelectItem value={AuditAction.COMPLETED}>Completed</SelectItem>
                <SelectItem value={AuditAction.STATUS_CHANGED}>Status Changed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {auditLogs && auditLogs.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  {!taskId && <TableHead>Entity</TableHead>}
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateWithTime(new Date(log.timestamp))}
                    </TableCell>
                    <TableCell>{log.userName || `User #${log.userId}`}</TableCell>
                    <TableCell>
                      {(() => {
                        const badgeStyles = getActionBadgeStyles(log.action);
                        return (
                          <Badge 
                            variant={badgeStyles.variant} 
                            className={badgeStyles.className}
                          >
                            {formatAction(log.action)}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    {!taskId && (
                      <TableCell>
                        {log.entityType} #{log.entityId}
                      </TableCell>
                    )}
                    <TableCell className="max-w-md truncate">
                      {log.details ? (
                        <div className="text-sm">
                          {typeof log.details === "string" ? log.details : formatJsonData(log.details)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No details provided</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found with the current filters.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {auditLogs?.length || 0} records
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

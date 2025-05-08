import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { TaskStatus, TaskPriority } from "@shared/schema";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskFiltersProps {
  onFilterChange: (filters: {
    status?: string[];
    priority?: string[];
    dueDate?: string;
  }) => void;
}

export function TaskFilter({ onFilterChange }: TaskFiltersProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => {
      const newStatuses = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      
      onFilterChange({
        status: newStatuses.length > 0 ? newStatuses : undefined,
        priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
        dueDate: selectedDueDate || undefined
      });
      
      return newStatuses;
    });
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities(prev => {
      const newPriorities = prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority];
      
      onFilterChange({
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        priority: newPriorities.length > 0 ? newPriorities : undefined,
        dueDate: selectedDueDate || undefined
      });
      
      return newPriorities;
    });
  };

  const setDueDate = (dateFilter: string) => {
    const newDateFilter = selectedDueDate === dateFilter ? null : dateFilter;
    setSelectedDueDate(newDateFilter);
    
    onFilterChange({
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
      dueDate: newDateFilter || undefined
    });
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedDueDate(null);
    
    onFilterChange({});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedDueDate) && (
            <span className="ml-1 rounded-full bg-primary w-2 h-2"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => toggleStatus(TaskStatus.NOT_STARTED)}
          className="flex items-center justify-between cursor-pointer"
        >
          Not Started
          {selectedStatuses.includes(TaskStatus.NOT_STARTED) && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => toggleStatus(TaskStatus.IN_PROGRESS)}
          className="flex items-center justify-between cursor-pointer"
        >
          In Progress
          {selectedStatuses.includes(TaskStatus.IN_PROGRESS) && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => toggleStatus(TaskStatus.COMPLETED)}
          className="flex items-center justify-between cursor-pointer"
        >
          Completed
          {selectedStatuses.includes(TaskStatus.COMPLETED) && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => togglePriority(TaskPriority.HIGH)}
          className="flex items-center justify-between cursor-pointer"
        >
          High
          {selectedPriorities.includes(TaskPriority.HIGH) && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => togglePriority(TaskPriority.MEDIUM)}
          className="flex items-center justify-between cursor-pointer"
        >
          Medium
          {selectedPriorities.includes(TaskPriority.MEDIUM) && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => togglePriority(TaskPriority.LOW)}
          className="flex items-center justify-between cursor-pointer"
        >
          Low
          {selectedPriorities.includes(TaskPriority.LOW) && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Due Date</DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => setDueDate('today')}
          className="flex items-center justify-between cursor-pointer"
        >
          Today
          {selectedDueDate === 'today' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setDueDate('week')}
          className="flex items-center justify-between cursor-pointer"
        >
          This Week
          {selectedDueDate === 'week' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setDueDate('month')}
          className="flex items-center justify-between cursor-pointer"
        >
          This Month
          {selectedDueDate === 'month' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setDueDate('overdue')}
          className="flex items-center justify-between cursor-pointer"
        >
          Overdue
          {selectedDueDate === 'overdue' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedDueDate) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearFilters} className="text-red-500 dark:text-red-400 cursor-pointer">
              Clear Filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

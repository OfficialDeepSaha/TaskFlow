import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/task-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Floating action button for quick task creation that appears on every screen
 */
export function QuickTaskButton() {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl 
                transition-all duration-300 bg-primary hover:bg-primary/90 hover:scale-105
                animate-in slide-in-from-bottom-5 delay-300 group"
              onClick={() => setIsTaskFormOpen(true)}
              size="icon"
            >
              <Plus className="h-6 w-6 group-hover:rotate-45 transition-transform duration-200" />
              <span className="sr-only">Create new task</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Add new task</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
      />
    </>
  );
}
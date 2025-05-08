import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/task-form";

/**
 * Floating action button for quick task creation that appears on every screen
 */
export function QuickTaskButton() {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        onClick={() => setIsTaskFormOpen(true)}
        size="icon"
        variant="default"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Create new task</span>
      </Button>

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
      />
    </>
  );
}
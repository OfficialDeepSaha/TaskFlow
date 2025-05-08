import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smile, User, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Task, TaskMoodType } from "@shared/schema";

interface TaskMoodReactionsProps {
  task: Task;
}

type MoodReaction = {
  id: number;
  taskId: number;
  userId: number;
  mood: string;
  comment: string | null;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    name: string;
    avatar?: string;
  };
};

// Map moods to emoji icons
const moodEmojis: Record<string, string> = {
  'happy': '😊',
  'excited': '🎉',
  'neutral': '😐',
  'worried': '😟',
  'stressed': '😰',
  'confused': '😕',
};

export function TaskMoodReactions({ task }: TaskMoodReactionsProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mood reactions for this task
  const { data: reactions = [], isLoading, error } = useQuery({
    queryKey: ['/api/tasks', task.id, 'mood-reactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/tasks/${task.id}/mood-reactions`);
      return res.json() as Promise<MoodReaction[]>;
    }
  });

  // Count reactions by mood type
  const moodCounts = reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.mood] = (acc[reaction.mood] || 0) + 1;
    return acc;
  }, {});

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async (data: { mood: string; comment?: string }) => {
      const res = await apiRequest('POST', `/api/tasks/${task.id}/mood-reactions`, data);
      return res.json() as Promise<MoodReaction>;
    },
    onSuccess: () => {
      // Reset form state
      setSelectedMood(null);
      setComment('');
      
      // Invalidate reactions query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id, 'mood-reactions'] });
      
      toast({
        title: "Reaction added",
        description: "Your mood reaction has been added to the task",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add reaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddReaction = () => {
    if (!selectedMood) return;
    
    addReactionMutation.mutate({
      mood: selectedMood,
      comment: comment || undefined
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading reactions...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-2">Failed to load reactions</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(TaskMoodType).map(([key, value]) => (
          <Button
            key={key}
            variant={selectedMood === value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMood(selectedMood === value ? null : value)}
            className="flex items-center gap-1"
          >
            <span>{moodEmojis[value] || value}</span>
            <span>{value}</span>
            {moodCounts[value] ? <span className="ml-1">({moodCounts[value]})</span> : null}
          </Button>
        ))}
      </div>

      {selectedMood && (
        <div className="space-y-2 mb-4">
          <textarea
            placeholder="Add a comment (optional)"
            className="w-full p-2 border rounded-md"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddReaction}
              disabled={addReactionMutation.isPending}
              size="sm"
            >
              {addReactionMutation.isPending ? "Adding..." : "Add Reaction"}
            </Button>
          </div>
        </div>
      )}

      {reactions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Team Reactions</h4>
          <Separator className="mb-2" />
          <div className="space-y-2">
            {reactions.map((reaction) => (
              <div key={reaction.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                <Avatar className="h-8 w-8">
                  {reaction.user?.avatar && <AvatarImage src={reaction.user.avatar} alt={reaction.user?.name || 'User'} />}
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{reaction.user?.name || 'Unknown user'}</span>
                    <span className="text-lg">{moodEmojis[reaction.mood] || reaction.mood}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(reaction.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {reaction.comment && (
                    <p className="text-sm mt-1">{reaction.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
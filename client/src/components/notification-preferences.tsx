import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { useToast } from "@/hooks/use-toast";

// Define NotificationChannel enum
type NotificationChannel = 'EMAIL' | 'IN_APP' | 'PUSH';

interface NotificationPreference {
  channel: NotificationChannel;
  enabled: boolean;
  events: {
    taskAssigned: boolean;
    taskUpdated: boolean;
    taskCompleted: boolean;
    dueDateReminder: boolean;
    mentions: boolean;
  };
}

interface NotificationPreferencesData {
  preferences: NotificationPreference[];
}

export function NotificationPreferences() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  
  // Fetch current notification preferences
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/notification-preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch notification preferences');
      return await response.json() as NotificationPreferencesData;
    },
    enabled: !!user // Only run query if user is logged in
  });

  const queryClient = useQueryClient();

  // Save preferences mutation
  const { mutate: savePreferences, isPending: isSaving } = useMutation({
    mutationFn: async (prefsToSave: NotificationPreference[]) => {
      const response = await fetch('/api/users/me/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences: prefsToSave })
      });
      if (!response.ok) throw new Error('Failed to save notification preferences');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Preferences",
        description: "There was a problem saving your notification preferences.",
        variant: "destructive",
      });
      console.error('Error saving notification preferences:', error);
    }
  });

  useEffect(() => {
    if (data?.preferences) {
      // Process the preferences to ensure they have the expected structure
      const processedPreferences = data.preferences.map(pref => ({
        channel: pref.channel,
        enabled: pref.enabled ?? true,
        events: {
          taskAssigned: pref.events?.taskAssigned ?? true,
          taskUpdated: pref.events?.taskUpdated ?? true,
          taskCompleted: pref.events?.taskCompleted ?? true,
          dueDateReminder: pref.events?.dueDateReminder ?? true,
          mentions: pref.events?.mentions ?? true
        }
      }));
      
      setPreferences(processedPreferences);
      setIsLocalLoading(false);
    }
  }, [data]);

  // Handle toggle of main channel switch
  const handleChannelToggle = (channelIndex: number, enabled: boolean) => {
    const updatedPreferences = [...preferences];
    updatedPreferences[channelIndex] = {
      ...updatedPreferences[channelIndex],
      enabled
    };
    setPreferences(updatedPreferences);
  };

  // Handle toggle of individual event switch
  const handleEventToggle = (channelIndex: number, eventKey: keyof NotificationPreference['events'], enabled: boolean) => {
    const updatedPreferences = [...preferences];
    updatedPreferences[channelIndex] = {
      ...updatedPreferences[channelIndex],
      events: {
        ...updatedPreferences[channelIndex].events,
        [eventKey]: enabled
      }
    };
    setPreferences(updatedPreferences);
  };

  // Handle toggle of individual notification channel
  const handleChannelToggle2 = (eventType: string, channel: NotificationChannel, checked: boolean) => {
    setPreferences(prevPrefs => {
      return prevPrefs.map(pref => {
        if (pref.channel === channel) {
          return {
            ...pref,
            enabled: checked
          };
        }
        return pref;
      });
    });
  };

  // Handle save button click
  const handleSave = () => {
    savePreferences(preferences);
  };

  if (isLoading || isLocalLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[300px]" />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-destructive/20 rounded-lg">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Preferences</h2>
        <p>There was a problem loading your notification preferences. Please try again later.</p>
      </div>
    );
  }

  // If no preferences exist yet, show a message
  if (!preferences || preferences.length === 0) {
    return (
      <div className="p-6 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold mb-2">No Notification Preferences</h2>
        <p>You don't have any notification preferences set up yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-muted-foreground">Customize how and when you receive notifications about your tasks.</p>
      </div>

      {preferences.map((preference, i) => (
        <Card key={preference.channel}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{getChannelDisplayName(preference.channel)}</CardTitle>
                <CardDescription>{getChannelDescription(preference.channel)}</CardDescription>
              </div>
              <Switch 
                checked={preference.enabled} 
                onCheckedChange={(checked) => handleChannelToggle(i, checked)}
                aria-label={`Enable ${preference.channel} notifications`}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {preference.enabled && (
              <>
                <p className="text-sm font-medium">Notify me about:</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${preference.channel}-taskAssigned`} className="flex-1">
                      Task assignments
                      <p className="text-sm font-normal text-muted-foreground">When a task is assigned to you</p>
                    </Label>
                    <Switch 
                      id={`${preference.channel}-taskAssigned`}
                      checked={preference.events.taskAssigned} 
                      onCheckedChange={(checked) => handleEventToggle(i, 'taskAssigned', checked)}
                      aria-label="Receive task assignment notifications"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${preference.channel}-taskUpdated`} className="flex-1">
                      Task updates
                      <p className="text-sm font-normal text-muted-foreground">When a task assigned to you is modified</p>
                    </Label>
                    <Switch 
                      id={`${preference.channel}-taskUpdated`}
                      checked={preference.events.taskUpdated} 
                      onCheckedChange={(checked) => handleEventToggle(i, 'taskUpdated', checked)}
                      aria-label="Receive task update notifications"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${preference.channel}-taskCompleted`} className="flex-1">
                      Task completions
                      <p className="text-sm font-normal text-muted-foreground">When a task you created is marked as completed</p>
                    </Label>
                    <Switch 
                      id={`${preference.channel}-taskCompleted`}
                      checked={preference.events.taskCompleted} 
                      onCheckedChange={(checked) => handleEventToggle(i, 'taskCompleted', checked)}
                      aria-label="Receive task completion notifications"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${preference.channel}-dueDateReminder`} className="flex-1">
                      Due date reminders
                      <p className="text-sm font-normal text-muted-foreground">Reminders before a task's due date</p>
                    </Label>
                    <Switch 
                      id={`${preference.channel}-dueDateReminder`}
                      checked={preference.events.dueDateReminder} 
                      onCheckedChange={(checked) => handleEventToggle(i, 'dueDateReminder', checked)}
                      aria-label="Receive due date reminder notifications"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${preference.channel}-mentions`} className="flex-1">
                      Mentions
                      <p className="text-sm font-normal text-muted-foreground">When someone mentions you in a comment</p>
                    </Label>
                    <Switch 
                      id={`${preference.channel}-mentions`}
                      checked={preference.events.mentions} 
                      onCheckedChange={(checked) => handleEventToggle(i, 'mentions', checked)}
                      aria-label="Receive mention notifications"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

// Helper functions to format channel names and descriptions
function getChannelDisplayName(channel: NotificationChannel): string {
  switch (channel) {
    case 'EMAIL':
      return 'Email Notifications';
    case 'IN_APP':
      return 'In-App Notifications';
    case 'PUSH':
      return 'Push Notifications';
    default:
      return channel;
  }
}

function getChannelDescription(channel: NotificationChannel): string {
  switch (channel) {
    case 'EMAIL':
      return 'Receive notifications via email to your registered email address.';
    case 'IN_APP':
      return 'Receive notifications within the application when you are logged in.';
    case 'PUSH':
      return 'Receive push notifications on your devices.';
    default:
      return '';
  }
}

// Export component
export default NotificationPreferences;

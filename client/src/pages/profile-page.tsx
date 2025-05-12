import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { User, NotificationChannel } from "../../../shared/schema";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Camera, UserCircle, X, Check } from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/utils";

// AWS S3 Configuration
const AWS_S3_BASE_URL = "https://ultimate-connector-bucket.s3.amazonaws.com/";

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  // Since email is stored in the username field in the database
  const [email, setEmail] = useState(user?.username || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<{
    channels: NotificationChannel[];
    taskAssignment: boolean;
    taskStatusUpdate: boolean;
    taskCompletion: boolean;
    taskDueSoon: boolean;
    systemUpdates: boolean;
  }>({ 
    channels: [], 
    taskAssignment: true, 
    taskStatusUpdate: true, 
    taskCompletion: true, 
    taskDueSoon: true, 
    systemUpdates: false 
  });
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      console.log('User data loaded:', user);
      setName(user.name || '');
      setPreviewUrl(user.avatar || null);
      
      // Email is stored in the username field in the database
      setEmail(user.username || '');
      
      // Initialize notification preferences from user data if available
      if (user.notificationPreferences) {
        setNotificationPrefs(user.notificationPreferences);
      }
    }
  }, [user]);

  // Generate preview when file is selected
  useEffect(() => {
    if (profilePicture) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(profilePicture);
    }
  }, [profilePicture]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, or GIF image.",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setProfilePicture(file);
    }
  };

  // Mutation for uploading profile picture to S3
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to S3 via backend
      const response = await axios.post('/api/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      return response.data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      setIsUploading(false);
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
        variant: "default"
      });
      
      // Update profile with new image URL
      updateProfileMutation.mutate({
        name,
        email,
        avatar: imageUrl
      });
    },
    onError: (error) => {
      setIsUploading(false);
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating user profile
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const response = await axios.put('/api/user/profile', userData, {
        withCredentials: true
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        variant: "default"
      });
      setIsEditing(false);
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle save profile
  const handleSaveProfile = () => {
    if (profilePicture) {
      // If there's a new profile picture, upload it first
      uploadImageMutation.mutate(profilePicture);
    } else {
      // Otherwise just update the profile name and avatar
      // Note that we're updating the username field with the email value
      updateProfileMutation.mutate({
        name,
        username: email, // Update username with email value
      });
    }
  };
  
  // Email is now updated via the username field in the updateProfileMutation

  // Reset form to original values
  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setProfilePicture(null);
    setPreviewUrl(user?.avatar || null);
    setIsEditing(false);
  };

  // Handle removing profile picture
  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    setPreviewUrl(null);
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };
  
  // Save notification preferences to the backend
  const saveNotificationPreferences = async () => {
    setIsUpdatingPrefs(true);
    
    try {
      const response = await axios.put('/api/user/notification-preferences', notificationPrefs, {
        withCredentials: true
      });
      
      if (response.status === 200) {
        toast({
          title: "Preferences saved",
          description: "Your notification preferences have been updated.",
          variant: "default"
        });
        
        // Update user data in cache to reflect new preferences
        refetchUser();
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Update failed",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          Your Profile
        </h1>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="account">Account Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
              {/* Profile Picture Section */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>
                    Your profile picture will be visible to your team members
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <div className="relative mb-4 group">
                    <Avatar className="h-40 w-40 border-4 border-primary/20 shadow-xl">
                      {previewUrl ? (
                        <AvatarImage src={previewUrl} alt={name} />
                      ) : (
                        <AvatarFallback className={`text-4xl ${getAvatarColor(name)}`}>
                          {getInitials(name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    {isEditing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center gap-2"
                      >
                        <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-sm"></div>
                        <Button 
                          size="icon" 
                          variant="secondary"
                          className="z-10 relative"
                          onClick={openFileSelector}
                        >
                          <Camera size={18} />
                        </Button>
                        {previewUrl && (
                          <Button 
                            size="icon" 
                            variant="destructive"
                            className="z-10 relative"
                            onClick={handleRemoveProfilePicture}
                          >
                            <X size={18} />
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileChange}
                  />
                  
                  {isEditing ? (
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      Click the camera icon above to upload a new picture.<br />
                      Maximum size: 5MB. JPEG, PNG, GIF only.
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={() => setIsEditing(true)}
                    >
                      <Upload size={16} className="mr-2" />
                      Change Picture
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {/* Profile Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Manage your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className={isEditing ? "border-primary/50" : ""}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditing}
                      className={isEditing ? "border-primary/50" : ""}
                    />
                    {isEditing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        This will update both your email and login username
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="p-2 bg-muted/50 rounded-md text-sm">
                      {user?.role || 'User'}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <AnimatePresence>
                    {isEditing ? (
                      <>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Button
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={updateProfileMutation.isPending || isUploading}
                          >
                            Cancel
                          </Button>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Button
                            onClick={handleSaveProfile}
                            disabled={updateProfileMutation.isPending || isUploading}
                          >
                            {(updateProfileMutation.isPending || isUploading) && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          onClick={() => setIsEditing(true)}
                        >
                          Edit Profile
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Customize how you receive notifications from TaskFlow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h3 className="font-medium">Account Status</h3>
                    <p className="text-sm text-muted-foreground">Your account is active</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Notification Channels</h3>
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="email-notifications" 
                        checked={notificationPrefs.channels.includes(NotificationChannel.EMAIL)}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => {
                            const newChannels = checked 
                              ? [...prev.channels, NotificationChannel.EMAIL] 
                              : prev.channels.filter(c => c !== NotificationChannel.EMAIL);
                            return { ...prev, channels: newChannels };
                          });
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="in-app-notifications" 
                        checked={notificationPrefs.channels.includes(NotificationChannel.IN_APP)}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => {
                            const newChannels = checked 
                              ? [...prev.channels, NotificationChannel.IN_APP] 
                              : prev.channels.filter(c => c !== NotificationChannel.IN_APP);
                            return { ...prev, channels: newChannels };
                          });
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="in-app-notifications" className="font-medium">In-App Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications in the app</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Notification Types</h3>
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="task-assigned" 
                        checked={notificationPrefs.taskAssignment}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => ({
                            ...prev,
                            taskAssignment: !!checked
                          }));
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-assigned" className="font-medium">Task Assignments</Label>
                        <p className="text-sm text-muted-foreground">When a task is assigned to you</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="task-updates" 
                        checked={notificationPrefs.taskStatusUpdate}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => ({
                            ...prev,
                            taskStatusUpdate: !!checked
                          }));
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-updates" className="font-medium">Task Updates</Label>
                        <p className="text-sm text-muted-foreground">When a task you're involved with is updated</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="task-completion" 
                        checked={notificationPrefs.taskCompletion}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => ({
                            ...prev,
                            taskCompletion: !!checked
                          }));
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="task-completion" className="font-medium">Task Completion</Label>
                        <p className="text-sm text-muted-foreground">When a task you're following is completed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="due-soon" 
                        checked={notificationPrefs.taskDueSoon}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => ({
                            ...prev,
                            taskDueSoon: !!checked
                          }));
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="due-soon" className="font-medium">Due Date Reminders</Label>
                        <p className="text-sm text-muted-foreground">Reminders for upcoming and overdue tasks</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="system-updates" 
                        checked={notificationPrefs.systemUpdates}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs(prev => ({
                            ...prev,
                            systemUpdates: !!checked
                          }));
                        }}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="system-updates" className="font-medium">System Updates</Label>
                        <p className="text-sm text-muted-foreground">Updates about TaskFlow features and announcements</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full sm:w-auto" 
                    onClick={saveNotificationPreferences}
                    disabled={isUpdatingPrefs}
                  >
                    {isUpdatingPrefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

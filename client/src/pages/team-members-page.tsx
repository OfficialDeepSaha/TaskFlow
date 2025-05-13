import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, User, UserPlus, Shield, Edit2, Trash2, X, UserX, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

// Define user type
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  username: string;
}

export default function TeamMembersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUserDetailsSheet, setOpenUserDetailsSheet] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) || 
      (user.email && user.email.toLowerCase().includes(query)) ||
      user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch all users from the API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog with user data
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    // Ensure we're setting all the required fields with proper values
    setEditForm({
      name: user.name || '',
      email: user.username || '',
      role: user.role || '',
    });
    console.log('Edit form data:', { user, editForm: {
      name: user.name || '',
      email: user.username || '',
      role: user.role || '',
    }});
    setOpenEditDialog(true);
  };

  // Open delete dialog
  const handleDeletePrompt = (user: User) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  // Open user details sheet
  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user);
    setOpenUserDetailsSheet(true);
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setLoadingAction(selectedUser.id);
    try {
      // Create the update payload, mapping email field back to username
      const updatePayload = {
        name: editForm.name,
        username: editForm.email,
        role: editForm.role
      };
      
      const response = await axios.put(`/api/users/${selectedUser.id}`, updatePayload);
      
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, ...response.data } : user
      ));
      
      setOpenEditDialog(false);
      
      toast({
        title: 'Success',
        description: `${selectedUser.name} has been updated.`,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setLoadingAction(selectedUser.id);
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setOpenDeleteDialog(false);
      
      toast({
        title: 'Success',
        description: `${selectedUser.name} has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    setLoadingAction(userId);
    try {
      await axios.patch(`/api/users/${userId}/status`, { isActive });
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
      
      toast({
        title: 'Success',
        description: `User has been ${isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Get role badge variant
  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Badge variant="destructive" className="bg-red-500">{role}</Badge>;
      case 'manager':
        return <Badge variant="default" className="bg-blue-500">{role}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Get status badge variant
  const getStatusBadge = (isActive?: boolean) => {
    return isActive === false ? 
      <Badge variant="destructive" className="flex items-center gap-1"><UserX className="h-3 w-3" /> Inactive</Badge> : 
      <Badge variant="default" className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>;
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              variant="default"
              onClick={() => window.location.href = '/dashboard'}
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Team Members</h2>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their roles
          </p>
        </div>
        
        <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[220px] pl-8"
            />
            <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          
        </div>
      </div>
      
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle>Team Members ({filteredUsers.length})</CardTitle>
            <Tabs defaultValue="all" className="w-full max-w-[400px]">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="all">All Members</TabsTrigger>
                <TabsTrigger value="active">Active Only</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground">Loading team members...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="bg-muted/40 p-4 rounded-full mb-4">
                <UserX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No team members found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                {searchQuery 
                  ? `No results for "${searchQuery}". Try a different search term.` 
                  : "You haven't added any team members yet."}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  <X className="h-4 w-4 mr-2" /> Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => handleViewUserDetails(user)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border/50">
                            <AvatarFallback className={getAvatarColor(user.name)}>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground hidden sm:block">{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStatusBadge(user.isActive)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleUserStatus(user.id, !user.isActive)}
                                className={!user.isActive ? 'text-green-600' : 'text-amber-600'}
                              >
                                {!user.isActive 
                                  ? <><CheckCircle className="h-4 w-4 mr-2" /> Activate</>
                                  : <><AlertCircle className="h-4 w-4 mr-2" /> Deactivate</>
                                }
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeletePrompt(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member details and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input 
                id="edit-name" 
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email address</Label>
              <Input 
                id="edit-email" 
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select 
                value={editForm.role}
                onValueChange={(value) => setEditForm({...editForm, role: value})}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={loadingAction === selectedUser?.id}>
              {loadingAction === selectedUser?.id ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                  Updating...
                </>
              ) : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The user will lose all access to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 border rounded-lg bg-destructive/10 mb-4">
            <p>Are you sure you want to delete <strong>{selectedUser?.name}</strong>?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={loadingAction === selectedUser?.id}>
              {loadingAction === selectedUser?.id ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground border-t-destructive"></div>
                  Deleting...
                </>
              ) : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* User Details Sheet */}
      <Sheet open={openUserDetailsSheet} onOpenChange={setOpenUserDetailsSheet}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>
              View and manage user information
            </SheetDescription>
          </SheetHeader>
          {selectedUser && (
            <div className="py-6">
              <div className="flex items-center mb-6">
                <Avatar className="h-16 w-16 mr-4 border-2 border-border/50">
                  <AvatarFallback className={getAvatarColor(selectedUser.name)}>
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser.isActive)}
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">User Info</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{selectedUser.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date Added</span>
                      <span>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <div>{getStatusBadge(selectedUser.isActive)}</div>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium mb-1">Account Status</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="user-active" className="flex-grow">Active account</Label>
                    <Switch
                      id="user-active"
                      checked={!!selectedUser.isActive}
                      onCheckedChange={(checked) => handleToggleUserStatus(selectedUser.id, checked)}
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="pt-4 flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => {
                      setOpenUserDetailsSheet(false);
                      handleEditUser(selectedUser);
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Edit User
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start" 
                    onClick={() => {
                      setOpenUserDetailsSheet(false);
                      handleDeletePrompt(selectedUser);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

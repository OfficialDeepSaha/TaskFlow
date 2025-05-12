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
      email: user.email || '',
      role: user.role || '',
    });
    console.log('Edit form data:', { user, editForm: {
      name: user.name || '',
      email: user.email || '',
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
      const response = await axios.put(`/api/users/${selectedUser.id}`, editForm);
      
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
    <div className="container px-4 py-6 mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground">
              Manage your team members and their access to the system.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to a new team member. They will receive an email to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input id="name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input id="email" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Members ({users.length}){searchQuery ? ` | Showing ${filteredUsers.length} result${filteredUsers.length !== 1 ? 's' : ''}` : ''}</CardTitle>
                <CardDescription>Manage your team and their permissions</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search members..."
                  className="w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
                        <p className="text-sm text-muted-foreground">Loading team members...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <p className="text-muted-foreground">No team members found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className={getAvatarColor(user.name)}>
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            {user.id === currentUser.id && (
                              <p className="text-xs text-muted-foreground">(You)</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                      <TableCell className="text-right">
                        {loadingAction === user.id ? (
                          <div className="flex justify-end">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUserDetails(user)}>
                                <User className="mr-2 h-4 w-4" />
                                <span>View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleUserStatus(user.id, user.isActive === false)}
                                disabled={user.id === currentUser.id}
                              >
                                {user.isActive === false ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    <span>Activate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="mr-2 h-4 w-4 text-destructive" />
                                    <span>Deactivate</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeletePrompt(user)}
                                disabled={user.id === currentUser.id}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the details for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3"
                placeholder="Enter email address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={loadingAction === selectedUser?.id}>
              {loadingAction === selectedUser?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={loadingAction === selectedUser?.id}
            >
              {loadingAction === selectedUser?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
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
              View detailed information about this team member.
            </SheetDescription>
          </SheetHeader>
          {selectedUser && (
            <div className="py-6">
              <div className="flex items-center justify-center mb-6">
                <Avatar className={`h-24 w-24 ${getAvatarColor(selectedUser.name)}`}>
                  <AvatarFallback className="text-2xl">{getInitials(selectedUser.name)}</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-center">{selectedUser.name}</h3>
                  <p className="text-muted-foreground text-center">{selectedUser.email}</p>
                </div>
                
                <div className="flex justify-center space-x-2">
                  {getRoleBadge(selectedUser.role)}
                  {getStatusBadge(selectedUser.isActive)}
                </div>
                
                <Separator />
                
                <Tabs defaultValue="info">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">User Info</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                  <TabsContent value="info" className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-sm font-medium text-muted-foreground">User ID</div>
                      <div className="col-span-2 text-sm font-mono">{selectedUser.id}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Created</div>
                      <div className="col-span-2 text-sm">
                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Status</div>
                      <div className="col-span-2 text-sm">
                        {selectedUser.isActive === false ? 'Inactive' : 'Active'}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="activity" className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Recent activity will be shown here in the future.
                    </p>
                  </TabsContent>
                </Tabs>
                
                <div className="flex flex-col space-y-2 mt-6">
                  <Button
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleEditUser(selectedUser)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit User
                  </Button>
                  
                  {selectedUser.id !== currentUser.id && (
                    <>
                      <Button
                        variant={selectedUser.isActive === false ? "default" : "secondary"}
                        className="w-full"
                        onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.isActive === false)}
                      >
                        {selectedUser.isActive === false ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activate User
                          </>
                        ) : (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate User
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          setOpenUserDetailsSheet(false);
                          handleDeletePrompt(selectedUser);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

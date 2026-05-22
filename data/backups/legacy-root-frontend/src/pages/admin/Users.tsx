import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Search, Plus, MoreHorizontal, UserCog, Shield, Users as UsersIcon, Loader2, Trash2, AlertTriangle, Mail, Eye, EyeOff
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import {
  useUsers,
  useLocalMRs,
  useCreateUser,
  useUpdateUser,
  useToggleUserStatus,
  useDeleteUser
} from '@/hooks/api';

import { supabase } from '@/integrations/supabase/client';

import { User, UserRole, LocalMR } from '@/types';
import {
  PasswordStrengthIndicator,
  usePasswordValidation
} from '@/components/ui/password-strength';

interface PurgeImpact {
  userId: string | null;
  email: string;
  hasProfile: boolean;
  profileName?: string;
  counts: {
    sales: number;
    visits: number;
    trainings: number;
    mechanisationJobs: number;
    machineryBookings: number;
    farmersRegistered: number;
    coordinatedLocalMrs: number;
  };
}

export function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Purge dialog state
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeEmail, setPurgeEmail] = useState('');
  const [purgeImpact, setPurgeImpact] = useState<PurgeImpact | null>(null);
  const [isPurgeLoading, setIsPurgeLoading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'tot' as UserRole,
    localMrId: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /** ================= API HOOKS ================= */
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: localMRs = [] } = useLocalMRs();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  /** ================= HELPERS ================= */
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'tot',
      localMrId: '',
      status: 'active',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const { isValid: isPasswordValid } = usePasswordValidation(formData.password);

  // Filter out admin users from the display list
  const filteredUsers = users.filter((user: User) => {
    // Hide admin users from the list
    if (user.role === 'admin') return false;
    
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBranchName = (id?: string, role?: string) => {
    if (role === 'manager') return 'Regional MR';
    return localMRs.find((m: LocalMR) => m.id === id)?.name || '-';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'local_mr_coordinator': return 'Coordinator';
      case 'tot': return 'TOT';
      case 'office_employee': return 'Office Employee';
      default: return role.toUpperCase();
    }
  };

  const roleBadge = (role: string) => (
    <Badge variant={role === 'admin' ? 'default' : role === 'manager' ? 'secondary' : 'outline'}>
      {getRoleLabel(role)}
    </Badge>
  );

  const statusBadge = (status: string) => (
    <Badge className={status === 'active' ? 'bg-green-500' : ''}>
      {status}
    </Badge>
  );

  /** ================= VALIDATION ================= */
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  /** ================= ACTIONS ================= */
  const handleAddUser = () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      toast.error('Name must be between 2 and 100 characters');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid phone number (10-15 digits)');
      return;
    }
    if (!formData.password) {
      toast.error('Password is required');
      return;
    }
    if (!isPasswordValid) {
      toast.error('Password does not meet security requirements');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.role !== 'admin' && formData.role !== 'manager' && !formData.localMrId) {
      toast.error('Please assign a Local MR for TOT or Coordinator');
      return;
    }

    createUser.mutate(
      {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        localMrId: (formData.role === 'admin' || formData.role === 'manager') ? undefined : formData.localMrId,
      },
      {
        onSuccess: () => {
          toast.success(`${formData.role.toUpperCase()} account created successfully`);
          setIsAddDialogOpen(false);
          resetForm();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || error.message || 'Failed to create user');
        },
      }
    );
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    // Validate fields
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!formData.phone.trim() || !validatePhone(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (formData.role !== 'admin' && formData.role !== 'manager' && !formData.localMrId) {
      toast.error('Please assign a Local MR for TOT or Coordinator');
      return;
    }

    updateUser.mutate(
      {
        id: selectedUser.id,
        data: {
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          status: formData.status,
          localMrId: (formData.role === 'admin' || formData.role === 'manager') ? undefined : formData.localMrId,
        },
      },
      {
        onSuccess: () => {
          toast.success('User updated successfully');
          setIsEditDialogOpen(false);
          setSelectedUser(null);
          resetForm();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || error.message || 'Failed to update user');
        },
      }
    );
  };

  const handleToggleStatus = (user: User) => {
    toggleStatus.mutate({
      id: user.id,
      status: user.status === 'active' ? 'inactive' : 'active',
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUser.mutate(selectedUser.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      },
    });
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role: user.role,
      localMrId: user.localMrId || user.local_mr_id || '',
      status: (user.status === 'active' || user.status === 'inactive') ? user.status : 'active',
    });
    setIsEditDialogOpen(true);
  };

  /** ================= PURGE ACTIONS ================= */
  const handlePurgePreview = async () => {
    if (!purgeEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsPurgeLoading(true);
    setPurgeImpact(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('purge-user-by-email', {
        body: { email: purgeEmail.trim(), preview: true },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to lookup user');
        return;
      }

      if (!data.found) {
        toast.info('No user found with this email');
        return;
      }

      setPurgeImpact(data.impact);
    } catch (err: any) {
      toast.error(err.message || 'Failed to check user');
    } finally {
      setIsPurgeLoading(false);
    }
  };

  const handlePurgeExecute = async () => {
    if (!purgeImpact?.userId) return;

    setIsPurging(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('purge-user-by-email', {
        body: { email: purgeEmail.trim(), preview: false },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to purge user');
        return;
      }

      toast.success(`User ${purgeEmail} has been purged`);
      setIsPurgeDialogOpen(false);
      setPurgeEmail('');
      setPurgeImpact(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to purge user');
    } finally {
      setIsPurging(false);
    }
  };

  /** ================= STATS ================= */
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Create and manage TOT, Manager, and Admin accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setPurgeEmail(''); setPurgeImpact(null); setIsPurgeDialogOpen(true); }}>
            <Mail className="mr-2 h-4 w-4" /> Purge by Email
          </Button>
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={UsersIcon} label="Total Users" value={totalUsers} />
        <StatCard icon={UserCog} label="Active Users" value={activeUsers} />
        <StatCard icon={Shield} label="Admins" value={adminCount} />
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found. Click "Add User" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roleBadge(user.role)}</TableCell>
                    <TableCell>{getBranchName(user.localMrId, user.role)}</TableCell>
                    <TableCell>{statusBadge(user.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD USER DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new TOT, Manager, or Admin to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full Name *</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Kamau"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.kamau@example.com"
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone Number *</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254712345678"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole, localMrId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tot">TOT (Technical Officer)</SelectItem>
                  <SelectItem value="local_mr_coordinator">Local MR Coordinator</SelectItem>
                  <SelectItem value="manager">Manager (Regional)</SelectItem>
                  <SelectItem value="office_employee">Office Employee (no commission)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role && (formData.role === 'tot' || formData.role === 'local_mr_coordinator') && (
              <div className="space-y-2">
                <Label>Assign to Local MR *</Label>
                <Select
                  value={formData.localMrId}
                  onValueChange={(value) => setFormData({ ...formData, localMrId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Local MR" />
                  </SelectTrigger>
                  <SelectContent>
                    {localMRs.map((mr: LocalMR) => (
                      <SelectItem key={mr.id} value={mr.id}>
                        {mr.name} ({mr.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="add-password">Password *</Label>
              <div className="relative">
                <Input
                  id="add-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-confirm-password">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="add-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              onClick={handleAddUser}
              className="w-full"
              disabled={createUser.isPending}
            >
              {createUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole, localMrId: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tot">TOT (Technical Officer)</SelectItem>
                  <SelectItem value="local_mr_coordinator">Local MR Coordinator</SelectItem>
                  <SelectItem value="manager">Manager (Regional)</SelectItem>
                  <SelectItem value="office_employee">Office Employee (no commission)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role && (formData.role === 'tot' || formData.role === 'local_mr_coordinator') && (
              <div className="space-y-2">
                <Label>Assign to Local MR *</Label>
                <Select
                  value={formData.localMrId}
                  onValueChange={(value) => setFormData({ ...formData, localMrId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Local MR" />
                  </SelectTrigger>
                  <SelectContent>
                    {localMRs.map((mr: LocalMR) => (
                      <SelectItem key={mr.id} value={mr.id}>
                        {mr.name} ({mr.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpdateUser}
              className="w-full"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE USER CONFIRMATION */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PURGE BY EMAIL DIALOG */}
      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Purge User by Email
            </DialogTitle>
            <DialogDescription>
              Completely remove a user and all their data from the system. Use this to clean up orphaned accounts that can't be re-created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purge-email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="purge-email"
                  type="email"
                  value={purgeEmail}
                  onChange={(e) => { setPurgeEmail(e.target.value); setPurgeImpact(null); }}
                  placeholder="user@example.com"
                  className="flex-1"
                />
                <Button
                  onClick={handlePurgePreview}
                  disabled={isPurgeLoading || !purgeEmail.trim()}
                  variant="secondary"
                >
                  {isPurgeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                </Button>
              </div>
            </div>

            {purgeImpact && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {purgeImpact.hasProfile ? purgeImpact.profileName : 'Orphaned Auth Account'}
                  </span>
                  <Badge variant={purgeImpact.hasProfile ? 'default' : 'destructive'}>
                    {purgeImpact.hasProfile ? 'Has Profile' : 'Orphaned'}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  The following data will be <span className="text-destructive font-medium">permanently deleted</span>:
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Sales</span>
                    <span className="font-medium">{purgeImpact.counts.sales}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Visits</span>
                    <span className="font-medium">{purgeImpact.counts.visits}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Trainings</span>
                    <span className="font-medium">{purgeImpact.counts.trainings}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Mech Jobs</span>
                    <span className="font-medium">{purgeImpact.counts.mechanisationJobs}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Bookings</span>
                    <span className="font-medium">{purgeImpact.counts.machineryBookings}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Coordinated MRs</span>
                    <span className="font-medium">{purgeImpact.counts.coordinatedLocalMrs}</span>
                  </div>
                </div>

                {purgeImpact.counts.farmersRegistered > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{purgeImpact.counts.farmersRegistered}</span> farmers registered by this user will be unlinked (not deleted).
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurgeExecute}
              disabled={!purgeImpact || isPurging}
            >
              {isPurging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Purging...
                </>
              ) : (
                'Purge User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** ================= SMALL STAT CARD ================= */
function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPrefetchHandlers, usePrefetchCommonRoutes } from '@/hooks/useRoutePrefetch';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Tractor,
  MapPin,
  GraduationCap,
  FileText,
  Package,
  Building2,
  Settings,
  LogOut,
  Menu,
  UserCog,
  Calculator,
  Shield,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// TOT: Read-only access to their own data
const totNavItems = [
  { to: '/dashboard/tot', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmers', icon: Users, label: 'My Farmers' },
  { to: '/sales', icon: ShoppingCart, label: 'My Sales' },
  { to: '/machinery', icon: Tractor, label: 'Machinery' },
  { to: '/visits', icon: MapPin, label: 'My Visits' },
  { to: '/trainings', icon: GraduationCap, label: 'Trainings' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/commission', icon: Calculator, label: 'My Commission' },
];

// Local MR Coordinator: Read-only, scoped to their Local MR
const coordinatorNavItems = [
  { to: '/dashboard/local-mr', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tots', icon: UserCog, label: 'TOT Overview' },
  { to: '/farmers', icon: Users, label: 'Farmers' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/machinery', icon: Tractor, label: 'Machinery' },
  { to: '/visits', icon: MapPin, label: 'Visits' },
  { to: '/trainings', icon: GraduationCap, label: 'Trainings' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/commission', icon: Calculator, label: 'Commission' },
];

// Manager: Read-only, organization-wide access
const managerNavItems = [
  { to: '/dashboard/manager', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/local-mrs', icon: Building2, label: 'Local MRs' },
  { to: '/tots', icon: UserCog, label: 'All TOTs' },
  { to: '/farmers', icon: Users, label: 'All Farmers' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales Overview' },
  { to: '/machinery', icon: Tractor, label: 'Machinery' },
  { to: '/visits', icon: MapPin, label: 'All Visits' },
  { to: '/trainings', icon: GraduationCap, label: 'Trainings' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/commission', icon: Calculator, label: 'Commission' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

// Admin: Full data entry and management access
const adminNavItems = [
  { to: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: UserCog, label: 'User Management' },
  { to: '/tots', icon: UserCog, label: 'All TOTs' },
  { to: '/local-mrs', icon: Building2, label: 'Local MRs' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/machinery', icon: Tractor, label: 'Machinery' },
  { to: '/farmers', icon: Users, label: 'All Farmers' },
  { to: '/sales', icon: ShoppingCart, label: 'All Sales' },
  { to: '/trainings', icon: GraduationCap, label: 'Trainings' },
  { to: '/visits', icon: MapPin, label: 'Visits' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/system-logs', icon: AlertCircle, label: 'System Logs' },
  { to: '/audit', icon: Shield, label: 'Audit Trail' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems =
    user?.role === 'admin'
      ? adminNavItems
      : user?.role === 'manager'
      ? managerNavItems
      : user?.role === 'local_mr_coordinator'
      ? coordinatorNavItems
      : totNavItems;

  // Prefetch common routes after initial load
  const commonRoutes = useMemo(() => navItems.slice(0, 5).map(item => item.to), [navItems]);
  usePrefetchCommonRoutes(commonRoutes);

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs">Admin</Badge>;
      case 'manager':
        return <Badge className="text-xs bg-purple-500">Manager</Badge>;
      case 'local_mr_coordinator':
        return <Badge variant="wheat" className="text-xs">Coordinator</Badge>;
      default:
        return <Badge variant="forest" className="text-xs">TOT</Badge>;
    }
  };

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
    toast.success('Logged out successfully');
    navigate('/auth', { replace: true });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-foreground hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] bg-sidebar text-sidebar-foreground p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 p-1.5 flex items-center justify-center bg-white rounded-lg">
              <img
                src="/mrlogo.png"
                alt="Machinery Ring Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <SheetTitle className="text-sidebar-foreground font-heading text-lg">
                Machinery Ring
              </SheetTitle>
              <p className="text-xs text-sidebar-foreground/70">Nyandarua</p>
            </div>
          </div>
        </SheetHeader>

        {/* User Profile */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg shadow-md">
              {user?.name?.split(' ').map(n => n[0].toUpperCase()).join('') || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sidebar-foreground truncate text-base">
                {user?.name || 'User'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge()}
                {user?.localMrName && (
                  <p className="text-xs text-sidebar-foreground/70 truncate">
                    {user.localMrName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map(item => {
              const prefetchHandlers = getPrefetchHandlers(item.to);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    onClick={() => setOpen(false)}
                    {...prefetchHandlers}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

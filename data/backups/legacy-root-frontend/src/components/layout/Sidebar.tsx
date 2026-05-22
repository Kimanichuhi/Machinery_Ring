import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPrefetchHandlers, usePrefetchCommonRoutes } from '@/hooks/useRoutePrefetch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  ChevronLeft,
  ChevronRight,
  UserCog,
  Calculator,
  Shield,
  Bell,
  AlertCircle,
  
} from 'lucide-react';
import { toast } from 'sonner';

/* -------------------- NAV CONFIG -------------------- */

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
};

// TOT: Read-only access to their own data
const totNavItems: NavItem[] = [
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
const coordinatorNavItems: NavItem[] = [
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
const managerNavItems: NavItem[] = [
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
const adminNavItems: NavItem[] = [
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

/* -------------------- COMPONENT -------------------- */

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
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

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/auth', { replace: true });
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-purple-500">Manager</Badge>;
      case 'local_mr_coordinator':
        return <Badge variant="wheat">Coordinator</Badge>;
      default:
        return <Badge variant="forest">TOT</Badge>;
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden lg:flex h-screen sticky top-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex-col transition-all duration-300',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-20 px-4 flex items-center border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 p-1 flex items-center justify-center">
              <img
                src="/mrlogo.png"
                alt="Machinery Ring Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-sm">Machinery Ring</p>
                <p className="text-xs opacity-70">Nyandarua</p>
              </div>
            )}
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-b border-sidebar-border">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-10 h-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <div className="flex gap-2 mt-1 items-center">
                  {getRoleBadge()}
                  {user?.localMrName && (
                    <span className="text-xs opacity-70 truncate">
                      {user.localMrName}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin">
          <ul className="p-3 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => {
              const prefetchHandlers = getPrefetchHandlers(to);
              return collapsed ? (
                <li key={to}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={to}
                        {...prefetchHandlers}
                        className={({ isActive }) =>
                          cn(
                            'w-full flex justify-center p-3 rounded-xl transition',
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'hover:bg-sidebar-accent'
                          )
                        }
                      >
                        <Icon className="w-5 h-5" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                </li>
              ) : (
                <li key={to}>
                  <NavLink
                    to={to}
                    {...prefetchHandlers}
                    className={({ isActive }) =>
                      cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow'
                          : 'hover:bg-sidebar-accent'
                      )
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="truncate">{label}</span>
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
            className={cn('w-full gap-3', collapsed && 'justify-center')}
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && 'Logout'}
          </Button>
        </div>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-24 w-7 h-10 bg-sidebar-primary text-sidebar-primary-foreground rounded-r-full flex items-center justify-center shadow"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </aside>
    </TooltipProvider>
  );
}

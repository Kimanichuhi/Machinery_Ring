// src/components/Header.tsx
import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Search, Cloud, CloudOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from './MobileNav';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = navigator.onLine;

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to search results or filter current page
      console.log('Search:', searchQuery);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'System Administrator';
      case 'manager':
        return 'Manager';
      case 'local_mr_coordinator':
        return 'Local MR Coordinator';
      case 'tot':
        return 'TOT';
      default:
        return 'User';
    }
  };

  return (
    <header
      className="h-14 sm:h-16 bg-card/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-40 supports-[backdrop-filter]:bg-card/95"
      role="banner"
    >
      {/* Left: Mobile menu + Greeting */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Mobile menu */}
        <MobileNav />

        {/* Greeting - desktop */}
        <div className="hidden sm:flex flex-col min-w-0">
          <h1 className="font-heading text-base sm:text-lg font-semibold text-foreground truncate">
            {getGreeting()}, {user?.name} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {getRoleTitle()}
          </p>
        </div>

        {/* Mobile title */}
        <div className="sm:hidden flex items-center gap-2">
          <div className="w-2 h-8 bg-gradient-to-b from-forest to-emerald-600 rounded-full" />
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">MR Nyandarua</h2>
            <p className="text-xs text-muted-foreground">{getRoleTitle()}</p>
          </div>
        </div>
      </div>

      {/* Right: Search + Status + Notifications + Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search - desktop */}
        <div className="relative hidden md:flex flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search farmers, sales, visits..."
            className="pl-10 bg-background border-border h-9 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Cloud className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">Synced</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-orange-600">
              <CloudOff className="w-4 h-4" />
              <Badge variant="warning" className="text-xs font-medium">
                Offline
              </Badge>
            </div>
          )}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Settings - Admin only */}
        {user?.role === 'admin' && (
          <Link to="/settings" className="hidden sm:flex">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="w-5 h-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

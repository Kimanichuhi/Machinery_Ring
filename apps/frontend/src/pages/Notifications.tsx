import { useState, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from 'sonner';
import { 
  Bell, CheckCircle, Trash2, Eye, Clock, 
  ShoppingCart, Tractor, Users, GraduationCap, AlertCircle,
  CheckSquare, X
} from 'lucide-react';
import { Notification } from '@/types';

export function Notifications() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sale':
      case 'sale_completed':
        return ShoppingCart;
      case 'mechanisation':
      case 'mechanisation_pending':
      case 'mechanisation_approved':
      case 'mechanisation_completed':
        return Tractor;
      case 'farmer':
        return Users;
      case 'training':
      case 'training_reminder':
        return GraduationCap;
      case 'support_request':
      case 'escalation':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'sale':
      case 'sale_completed':
      case 'commission':
        return 'text-emerald-600 bg-emerald-50';
      case 'mechanisation':
      case 'mechanisation_pending':
        return 'text-orange-600 bg-orange-50';
      case 'mechanisation_approved':
      case 'mechanisation_completed':
        return 'text-green-600 bg-green-50';
      case 'training':
      case 'training_reminder':
        return 'text-blue-600 bg-blue-50';
      case 'support_request':
      case 'escalation':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(date));
  };

  // Long press handlers for mobile multi-select
  const handleTouchStart = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelecting(true);
      setSelectedIds(new Set([id]));
      toast.info('Multi-select mode enabled');
    }, 500); // 500ms long press
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSelect = (id: string) => {
    if (!isSelecting) return;
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkMarkRead = () => {
    selectedIds.forEach(id => markAsRead(id));
    toast.success(`${selectedIds.size} notifications marked as read`);
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteNotification(id));
    toast.success(`${selectedIds.size} notifications deleted`);
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSelecting ? (
            <>
              <Badge variant="secondary" className="text-sm">
                {selectedIds.size} selected
              </Badge>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                <CheckSquare className="w-4 h-4 mr-2" />
                {selectedIds.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkMarkRead} disabled={selectedIds.size === 0}>
                <Eye className="w-4 h-4 mr-2" />
                Mark Read
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelSelection}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button 
                variant={filter === 'unread' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All Read
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setIsSelecting(true); toast.info('Select notifications to perform bulk actions'); }}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Unread</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{notifications.filter(n => n.read).length}</p>
              <p className="text-sm text-muted-foreground">Read</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {notifications.filter(n => n.type.includes('pending') || n.type.includes('support')).length}
              </p>
              <p className="text-sm text-muted-foreground">Pending Action</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info banner for long press */}
      {!isSelecting && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span>Tip: Long press on a notification or click "Select" to enable multi-select mode</span>
        </div>
      )}

      {/* Notifications List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">
            {filter === 'all' ? 'All Notifications' : 'Unread Notifications'} ({filteredNotifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);
                const isSelected = selectedIds.has(notification.id);
                
                return (
                  <div 
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-primary/5' : ''
                    } ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}`}
                    onTouchStart={() => handleTouchStart(notification.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onClick={() => isSelecting && handleSelect(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      {isSelecting && (
                        <div className="flex items-center pt-1">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleSelect(notification.id)}
                          />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            {notification.localMrName && (
                              <Badge variant="outline" className="mt-2 text-xs">{notification.localMrName}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        {!isSelecting && (
                          <div className="flex items-center gap-2 mt-3">
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

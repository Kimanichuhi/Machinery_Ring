import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShoppingCart, Users, Wrench, GraduationCap, MapPin } from "lucide-react";

interface ActivityItem {
  _id: string;
  type: 'sale' | 'farmer' | 'visit' | 'training' | 'mechanisation';
  title: string;
  description: string;
  time: string;
}

const activityIcons = {
  sale: ShoppingCart,
  farmer: Users,
  visit: MapPin,
  training: GraduationCap,
  mechanisation: Wrench,
};

const activityColors = {
  sale: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  farmer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  visit: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  training: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  mechanisation: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

interface RecentActivityProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivity({ activities = [], isLoading = false }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type] || Activity;
              const colorClass = activityColors[activity.type] || activityColors.sale;
              
              return (
                <div key={activity._id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

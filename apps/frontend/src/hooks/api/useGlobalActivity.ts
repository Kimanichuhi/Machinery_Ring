import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  type: 'sale' | 'training' | 'booking' | 'visit' | 'farmer';
  title: string;
  description: string;
  time: string;
  timestamp: Date;
}

export function useGlobalActivity(limit = 20) {
  return useQuery({
    queryKey: ['global-activity', limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      const activities: ActivityItem[] = [];

      // Fetch recent sales
      const { data: sales } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, farmer_id, farmers(name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sales) {
        sales.forEach((sale) => {
          const farmerName = (sale.farmers as any)?.name || 'Unknown';
          activities.push({
            id: `sale-${sale.id}`,
            type: 'sale',
            title: 'New Sale Recorded',
            description: `Sale of KES ${sale.total_amount?.toLocaleString()} to ${farmerName}`,
            time: formatRelativeTime(new Date(sale.created_at)),
            timestamp: new Date(sale.created_at),
          });
        });
      }

      // Fetch recent trainings
      const { data: trainings } = await supabase
        .from('trainings')
        .select('id, created_at, title, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (trainings) {
        trainings.forEach((training) => {
          activities.push({
            id: `training-${training.id}`,
            type: 'training',
            title: training.status === 'Completed' ? 'Training Completed' : 'Training Scheduled',
            description: training.title,
            time: formatRelativeTime(new Date(training.updated_at)),
            timestamp: new Date(training.updated_at),
          });
        });
      }

      // Fetch recent bookings
      const { data: bookings } = await supabase
        .from('machinery_bookings')
        .select('id, created_at, machinery_id, machinery(name), status')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (bookings) {
        bookings.forEach((booking) => {
          const machineryName = (booking.machinery as any)?.name || 'Equipment';
          activities.push({
            id: `booking-${booking.id}`,
            type: 'booking',
            title: 'Machinery Booked',
            description: `${machineryName} booking ${booking.status}`,
            time: formatRelativeTime(new Date(booking.created_at)),
            timestamp: new Date(booking.created_at),
          });
        });
      }

      // Fetch recent visits
      const { data: visits } = await supabase
        .from('visits')
        .select('id, created_at, purpose, farmer_id, farmers(name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (visits) {
        visits.forEach((visit) => {
          const farmerName = (visit.farmers as any)?.name || 'Unknown';
          activities.push({
            id: `visit-${visit.id}`,
            type: 'visit',
            title: 'Farm Visit',
            description: `${visit.purpose} visit to ${farmerName}`,
            time: formatRelativeTime(new Date(visit.created_at)),
            timestamp: new Date(visit.created_at),
          });
        });
      }

      // Fetch recent farmers
      const { data: farmers } = await supabase
        .from('farmers')
        .select('id, created_at, name, county')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (farmers) {
        farmers.forEach((farmer) => {
          activities.push({
            id: `farmer-${farmer.id}`,
            type: 'farmer',
            title: 'New Farmer Registered',
            description: `${farmer.name} from ${farmer.county}`,
            time: formatRelativeTime(new Date(farmer.created_at)),
            timestamp: new Date(farmer.created_at),
          });
        });
      }

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

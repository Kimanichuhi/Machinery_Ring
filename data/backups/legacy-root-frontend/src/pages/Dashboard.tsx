import { useAuth } from '@/contexts/AuthContext';
import { TotDashboard } from './dashboard/TotDashboard';
import { ManagerDashboard } from './dashboard/ManagerDashboard';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { CoordinatorDashboard } from './dashboard/CoordinatorDashboard';

export function Dashboard() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'local_mr_coordinator':
      return <CoordinatorDashboard />;
    default:
      return <TotDashboard />;
  }
}

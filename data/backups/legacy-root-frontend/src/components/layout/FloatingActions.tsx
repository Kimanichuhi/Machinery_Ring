// src/components/FloatingActions.tsx
// Admin-only data entry - FloatingActions restricted to Admin role only
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, X, Users, ShoppingCart, MapPin, GraduationCap } from 'lucide-react';
import { FarmerFormDialog } from '@/components/forms/FarmerFormDialog';
import { SaleFormDialog } from '@/components/forms/SaleFormDialog';
import { VisitFormDialog } from '@/components/forms/VisitFormDialog';
import { TrainingFormDialog } from '@/components/forms/TrainingFormDialog';
import { useAuth } from '@/contexts/AuthContext';
interface FloatingAction {
  icon: React.ElementType;
  label: string;
}
export function FloatingActions() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const {
    isAdmin,
    user
  } = useAuth();

  // Dialog states (declared before any conditional returns to keep hook order stable)
  const [farmerDialogOpen, setFarmerDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);

  // TOTs can only log visits, Admin can do everything
  const isTOT = user?.role === 'tot';
  const canLogVisit = isAdmin || isTOT;

  // If not admin and not TOT, hide completely
  if (!isAdmin && !isTOT) return null;

  // Build actions based on role
  const actions: FloatingAction[] = [];

  // Admin-only actions
  if (isAdmin) {
    actions.push(
      { icon: Users, label: 'Add Farmer' },
      { icon: ShoppingCart, label: 'Record Sale' },
      { icon: GraduationCap, label: 'Schedule Training' }
    );
  }

  // Both Admin and TOT can log visits
  if (canLogVisit) {
    actions.push({ icon: MapPin, label: 'Log Visit' });
  }

  // Filter actions by current page
  const currentPath = location.pathname.split('/')[1];
  const relevantActions = actions.filter(action => {
    const relevantPages: Record<string, boolean> = {
      farmers: action.label.includes('Farmer'),
      sales: action.label.includes('Sale'),
      machinery: action.label.includes('Booking'),
      visits: action.label.includes('Visit'),
      trainings: action.label.includes('Training'),
      dashboard: true
    };
    return relevantPages[currentPath] || currentPath === 'dashboard';
  });
  if (relevantActions.length === 0) return null;

  // Single action
  if (relevantActions.length === 1) {
    const action = relevantActions[0];
    return <>
        <FarmerFormDialog open={farmerDialogOpen} onOpenChange={setFarmerDialogOpen} onSubmit={() => {}} />
        <SaleFormDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} onSubmit={() => {}} />
        <TrainingFormDialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen} onSubmit={() => {}} />
        <VisitFormDialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen} onSubmit={() => {}} />
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" variant="forest" className="h-14 w-14 rounded-full shadow-elevated" onClick={() => {
          const setOpen: Record<string, React.Dispatch<React.SetStateAction<boolean>>> = {
            'Add Farmer': setFarmerDialogOpen,
            'Record Sale': setSaleDialogOpen,
            'Log Visit': setVisitDialogOpen,
            'Schedule Training': setTrainingDialogOpen
          };
          setOpen[action.label]?.(true);
        }}>
            <action.icon className="w-6 h-6" />
            <span className="sr-only">{action.label}</span>
          </Button>
        </div>
      </>;
  }

  // Multiple actions FAB menu
  return <>
      {/* Render all dialogs */}
      <FarmerFormDialog open={farmerDialogOpen} onOpenChange={setFarmerDialogOpen} onSubmit={() => {}} />
      <SaleFormDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} onSubmit={() => {}} />
      <TrainingFormDialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen} onSubmit={() => {}} />
      <VisitFormDialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen} onSubmit={() => {}} />

      <div className="fixed bottom-6 right-6 z-50">
        {/* Secondary actions */}
        <div className={cn('flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ease-out', isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none')}>
          {relevantActions.map((action, index) => <div key={action.label} className="flex items-center gap-3 justify-end animate-in slide-in-from-bottom-2" style={{
          animationDelay: `${index * 50}ms`
        }}>
              <span className="bg-card text-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-card whitespace-nowrap">
                {action.label}
              </span>
              <Button size="icon" variant="forest" className="h-12 w-12 rounded-full shadow-card" onClick={() => {
            const setOpen: Record<string, React.Dispatch<React.SetStateAction<boolean>>> = {
              'Add Farmer': setFarmerDialogOpen,
              'Record Sale': setSaleDialogOpen,
              'Log Visit': setVisitDialogOpen,
              'Schedule Training': setTrainingDialogOpen
            };
            setOpen[action.label]?.(true);
            setIsOpen(false);
          }}>
                <action.icon className="w-5 h-5" />
              </Button>
            </div>)}
        </div>

        {/* Main FAB */}
        <Button size="lg" variant="forest" className={cn('h-14 w-14 rounded-full shadow-elevated transition-all duration-300', isOpen && 'rotate-45 scale-110')} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          <span className="sr-only">Open actions menu</span>
        </Button>
      </div>
    </>;
}
// types.ts

// -----------------------------
// User Roles & Users
// -----------------------------
export type UserRole = 'admin' | 'manager' | 'local_mr_coordinator' | 'tot' | 'office_employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  localMrId?: string;
  local_mr_id?: string;
  localMrName?: string;
  local_mr_name?: string;
  status: 'active' | 'inactive' | string;
  avatar?: string;
  avatar_url?: string | null;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
  // Performance metrics
  salesCount?: number;
  totalRevenue?: number;
  totalCommission?: number;
  jobsCount?: number;
  completedJobsCount?: number;
  trainingsCount?: number;
  completedTrainingsCount?: number;
  visitsCount?: number;
  lastActivityDate?: Date | string | null;
}

// -----------------------------
// Local MR
// -----------------------------
export interface LocalMR {
  id: string;
  name: string;
  code?: string;
  region: string;
  county: string;
  subcounty?: string;
  sub_county?: string;
  ward?: string;
  coordinator_id?: string;
  coordinatorName?: string;
  managerName?: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  totalTots: number;
  totalFarmers: number;
  created_at?: string;
  updated_at?: string;
}

// Alias
export type Branch = LocalMR;

// -----------------------------
// Machinery
// -----------------------------
export type MachineryStatus = 'available' | 'booked' | 'maintenance';

export interface Machinery {
  id: string;
  name: string;
  category: string;
  type?: string;
  status: MachineryStatus | string;
  pricePerAcre: number;
  daily_rate?: number;
  hourly_rate?: number;
  localMrId?: string;
  local_mr_id?: string | null;
  description?: string;
  model?: string | null;
  condition?: string | null;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
}

// -----------------------------
// Value Chains & Farmer Categories
// -----------------------------
export type ValueChain = 
  | 'Maize'
  | 'Wheat'
  | 'Dairy'
  | 'Poultry'
  | 'Horticulture'
  | 'Coffee'
  | 'Tea'
  | 'Sugarcane'
  | 'Livestock'
  | 'Mixed Farming'
  | string;

export type FarmerCategory = 'New' | 'Existing' | 'Pioneer' | string;
export type FarmerRating = 'Active' | 'Dormant' | 'High-Value' | string;

// -----------------------------
// Farmer
// -----------------------------
export interface Farmer {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  age?: number;
  gender?: string | null;
  // Sensitive PII (date_of_birth, id_number) moved to farmer_private_data table
  location: {
    village: string;
    ward: string;
    subcounty?: string;
    subCounty?: string;
    county: string;
  };
  // Supabase fields
  county?: string;
  sub_county?: string | null;
  ward?: string | null;
  village?: string | null;
  farm_size?: number | null;
  farming_type?: string | null;
  crops?: string[] | null;
  livestock?: string[] | null;
  status?: string;
  // Legacy and computed fields
  localMrId: string | null;
  local_mr_id?: string | null;
  localMrName?: string;
  local_mr_name?: string | null;
  valueChain: ValueChain;
  farmerCategory: FarmerCategory;
  farmerRating: FarmerRating;
  registeredBy?: string | null;
  registered_by?: string | null;
  totalPurchases?: number;
  mechanisationCount?: number;
  trainingsAttended: number;
  trainings_attended?: number;
  visitsCount: number;
  visits_count?: number;
  lastActivityDate?: Date | string | null;
  last_activity_date?: string | null;
  createdAt: Date | string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
  lastEditedAt?: Date;
  lastEditedBy?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalRequestedBy?: string;
}

// -----------------------------
// Products
// -----------------------------
export type ProductCategory =
  | 'Seeds'
  | 'Fertilizers'
  | 'Agrochemicals'
  | 'Animal Feeds & Supplements'
  | 'Services'
  | 'Equipment'
  | 'Others'
  | string;

export interface Product {
  id: string;
  name: string;
  sku: string;
  inStock: number;
  stock_quantity?: number;
  unitPrice: number;
  unit_price?: number;
  description: string | null;
  commission: number;
  commission_per_unit?: number;
  category: ProductCategory;
  unit?: string;
  min_stock_level?: number;
  status?: string;
  imageUrl?: string;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
  lastEditedAt?: Date;
  lastEditedBy?: string;
}

// -----------------------------
// Sales
// -----------------------------
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | string;

export interface Sale {
  id: string;
  totId: string;
  tot_id?: string;
  totName?: string;
  localMrId?: string;
  local_mr_id?: string;
  localMrName?: string;
  farmerId: string;
  farmer_id?: string;
  farmerName?: string;
  productId: string;
  product_id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit_price?: number;
  total: number;
  total_amount?: number;
  commissionAmount: number;
  commission_amount?: number;
  commission_paid_at?: string | null;
  date: Date | string;
  sale_date?: string;
  status: SaleStatus;
  payment_status?: string;
  payment_method?: string | null;
  commission_paid?: boolean;
  commission_per_unit?: number;
  deliveryNoteNumber?: string | null;
  delivery_note_number?: string | null;
  profitAmount?: number;
  profit_amount?: number;
  totCommission?: number;
  tot_commission?: number;
  regionalMrCommission?: number;
  regional_mr_commission?: number;
  localMrCommission?: number;
  local_mr_commission?: number;
  notes?: string | null;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
  lastEditedAt?: Date;
  lastEditedBy?: string;
}

// -----------------------------
// Mechanisation Jobs
// -----------------------------
export type MechanisationStatus =
  | 'pending-approval'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | string;

export interface MechanisationJob {
  id: string;
  farmerId: string;
  farmer_id?: string;
  farmerName?: string;
  localMrId?: string;
  local_mr_id?: string;
  localMrName?: string;
  machineryId: string;
  machinery_id?: string;
  machineryName: string;
  serviceType: string;
  service_type?: string;
  acreage: number;
  area_acres?: number | null;
  pricePerAcre?: number;
  totalPrice: number;
  total_cost?: number;
  commissionAmount?: number;
  status: MechanisationStatus;
  bookedBy?: string;
  tot_id?: string;
  bookedByName?: string;
  scheduledDate: Date | string;
  scheduled_date?: string;
  scheduled_time?: string | null;
  completedDate?: Date | string | null;
  completed_at?: string | null;
  duration_hours?: number | null;
  completion_notes?: string | null;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  rescheduledDate?: Date;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
  lastEditedAt?: Date;
  lastEditedBy?: string;
  gpsLocation?: { lat: number; lng: number };
  notes?: string;
  completionReport?: {
    summary: string;
    duration: string;
    outcome: string;
    completedAt: Date;
  };
}

// -----------------------------
// Visits
// -----------------------------
export interface Visit {
  id: string;
  farmerId: string;
  farmer_id?: string;
  farmerName?: string;
  totId: string;
  tot_id?: string;
  totName?: string;
  localMrId?: string;
  local_mr_id?: string | null;
  localMrName?: string;
  date: Date | string;
  visit_date?: string;
  gpsLocation?: { lat: number; lng: number };
  notes: string | null;
  images?: string[];
  purpose: string;
  follow_up_required?: boolean;
  follow_up_date?: string | null;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
}

// -----------------------------
// Trainings
// -----------------------------
export type TrainingStatus = 'Upcoming' | 'Completed' | 'upcoming' | 'completed' | string;
export type TrainingType = 'Workshop' | 'Field Day' | 'Seminar' | 'Demonstration' | 'Online Training' | string;

export interface Training {
  id: string;
  type?: TrainingType;
  training_type?: string;
  title: string;
  description?: string | null;
  date: Date | string;
  scheduled_date?: string;
  scheduled_time?: string | null;
  status: TrainingStatus;
  attendees: string[]; // farmer ids
  attendeeNames?: string[];
  trainerId: string; // TOT id
  trainer_id?: string;
  trainerName?: string;
  topics?: string[];
  location: string;
  venue?: string | null;
  localMrId?: string;
  local_mr_id?: string | null;
  localMrName?: string;
  duration: number; // hours
  duration_hours?: number | null;
  max_attendees?: number | null;
  images?: string[];
  completed_at?: string | null;
  createdAt?: Date | string;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
}

// -----------------------------
// Notifications
// -----------------------------
export type NotificationType =
  | 'sale'
  | 'sale_completed'
  | 'commission'
  | 'mechanisation'
  | 'mechanisation_pending'
  | 'mechanisation_approved'
  | 'mechanisation_rejected'
  | 'mechanisation_completed'
  | 'farmer'
  | 'farmer_approval'
  | 'training'
  | 'visit'
  | 'manager_message'
  | 'system'
  | 'training_reminder'
  | 'visit_logged'
  | 'support_request'
  | 'escalation'
  | 'failed_operation'
  | 'info'
  | string;

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
  created_at?: string;
  read_at?: string | null;
  userId?: string;
  user_id?: string | null;
  localMrId?: string;
  local_mr_id?: string | null;
  localMrName?: string;
  reportedBy?: string;
  issueType?: string;
  resolutionStatus?: 'pending' | 'resolved' | 'escalated';
  link?: string;
  metadata?: Record<string, any>;
}

// -----------------------------
// Farmer Approval Request
// -----------------------------
export type ApprovalType = 'add' | 'edit';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface FarmerApprovalRequest {
  id: string;
  farmerId?: string;
  farmerData: Partial<Farmer>;
  type: ApprovalType;
  status: ApprovalStatus;
  requestedBy: string;
  requestedByName: string;
  localMrId: string;
  localMrName: string;
  createdAt: Date | string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

// -----------------------------
// Dashboard & TOT Performance
// -----------------------------
export interface DashboardStats {
  totalFarmers: number;
  totalSales: number;
  totalRevenue: number;
  mechanisationJobs: number;
  visitsCompleted: number;
  trainingsHeld: number;
  pendingSync?: number;
  pendingApprovals?: number;
  totalCommission?: number;
}

export interface TOTPerformance {
  totId: string;
  totName: string;
  localMrId: string;
  localMrName: string;
  status: 'active' | 'inactive' | string;
  phone: string;
  email: string;
  totalSales: number;
  totalCommission: number;
  mechanisationJobsCompleted: number;
  trainingsConducted: number; 
  visitsLogged: number;
  lastActivityDate?: Date;
  salesByProduct?: {
    productId: string;
    productName: string;
    quantity: number;
    totalSales: number;
    commission: number;
  }[];
}

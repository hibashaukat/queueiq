export interface Clinic {
  id: string;
  name: string;
  hours: { open: string; close: string };
  rating: number;
  distance: number;
  address: string;
  departments: Department[];
  orgCode: string;
  type: 'clinic';
}

export interface Department {
  id: string;
  icon: string;
  name: string;
  count: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  reviews: number;
  fee: number;
  schedule: ScheduleBlock[];
  email?: string;
}

export interface ScheduleBlock {
  days: string[];
  start: string;
  end: string;
}

export interface Booking {
  voucherId: string;
  yourToken: string;
  orgName: string;
  category: string;
  phone: string;
  date: string;
  paymentStatus: 'Paid' | 'Pending' | 'paid' | 'unpaid' | 'reserved_unpaid' | 'pending_verification';
  tokenType: 'normal' | 'express' | 'emergency' | 'future';
  currentTokenNum?: number;
  yourTokenNum?: number;
  method?: 'jazzcash' | 'reception';
  reservedAt?: number;
  reserveWindowSec?: number;
  token?: string;
  txnId?: string | null;
  wait?: number;
}

export interface Organization {
    name: string;
    type: 'clinic' | 'bank' | 'salon' | 'government' | 'lab';
    status: 'open' | 'closed';
    rating: number;
    distance: number;
    wait?: number;
    clinicId?: string;
}

export interface BookingState {
  flow: 'clinic' | 'generic';
  org: Organization;
  clinicId: string | null;
  step: string;
  deptId?: string;
  doctorListLoaded?: boolean;
  doctorSearch?: string;
  doctorSort?: 'today' | 'rating' | 'experience';
  doctorId?: string;
  futureDate?: string;
  tokenType?: 'normal' | 'express' | 'emergency';
  emergencyType?: string;
  emergencyDesc?: string;
  emergencyConfirm?: boolean;
  voucher?: any; // Can be improved
  paymentTab?: 'online' | 'reception';
  paymentSubTab?: 'jazzcash' | 'bank' | 'card';
  receptionAgree?: boolean;
  date?: Date;
  category?: string;
  phone?: string;
  genericRecord?: any; // Can be improved
}

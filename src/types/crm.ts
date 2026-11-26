export type TransactionType = 'resale' | 'rent';

export type PropertyCategory = 
  | 'flat' 
  | 'house_villa' 
  | 'plot' 
  | 'commercial' 
  | 'farmhouse';

export type PropertyStatus = 
  | 'available' 
  | 'under_discussion' 
  | 'token_received' 
  | 'sold' 
  | 'rented';

export type LeadIntent = 
  | 'Wants to Buy a Property (Resale)'
  | 'Wants to Rent a Property'
  | 'Wants to Sell Their Property (House/Villa/Farm)'
  | 'Wants to Rent Out Their Property';

export type LeadStage = 
  | 'new'
  | 'contacted'
  | 'visit_scheduled'
  | 'visit_done'
  | 'negotiation'
  | 'token_received'
  | 'closed'
  | 'lost';

export type LeadPriority = 'hot' | 'warm' | 'cold';

export type LeadSource = 
  | 'Website'
  | 'JustDial'
  | 'Direct Call'
  | 'Walk-in'
  | 'Reference/Referral'
  | 'Referral'
  | 'WhatsApp'
  | 'Facebook Ad'
  | 'Google Ad'
  | 'Instagram Ad'
  | 'Canopy'
  | 'Site Visit'
  | 'Phone Enquiry'
  | 'MagicBricks'
  | '99acres'
  | 'Other';

export interface CrmUserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
  color: string;
  isActive: boolean;
  department?: string;
}

export interface SaraswatiProject {
  id: string;
  name: string;
  projectCode?: string;
  location: string;
  status: string;
  totalPlots: number;
  soldPlots: number;
  vacantPlots: number;
  totalArea?: string;
  description?: string;
  priceDisplay?: string;
  pricePerSqft?: number;
  projectType?: 'own_development' | 'associate_mandate';
  developerName?: string;
  reraNumber?: string;
  nmrdaNumber?: string;
  amenities: string[];
  brandPrimaryColor?: string;
}

export interface LegalAudit {
  nmrdaApproved: boolean;
  reraRegistered: boolean;
  reraNumber?: string;
  rlAvailable: boolean; // Release Letter
  nitApproved: boolean;
  clearTitle: boolean;
  titleVerification?: boolean; // Title verification certificate / search report
  loanEligible: boolean;
  eligibleBanks: string[];
  propertyTaxPaid?: boolean;
}

export interface PropertyOwner {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  negotiable: boolean;
  commissionPercent?: number;
  notes?: string;
}

export interface ResaleProperty {
  id: string;
  propertyCode?: string; // e.g. "NP-1001"
  title: string;
  transactionType: TransactionType; // resale / rent
  propertyFor?: 'For Sell' | 'For Rent';
  category: PropertyCategory;
  city?: string; // Default: "Nagpur"
  pincode?: string; // e.g. "440027", "440034"
  locality: string; // e.g. "Besa", "Wardha Road", "Manish Nagar"
  corridor: string;
  address: string;
  landmark?: string;
  mapsUrl?: string;
  
  // Pricing
  price: string; // e.g. "₹58 Lakhs", "₹22,000 / month"
  priceNumeric: number; // in INR e.g. 5800000
  ratePerSqFt?: number;
  maintenanceMonthly?: number;
  
  // Dimensions & layout
  areaSqFt: number; // Super builtup or plot area
  carpetAreaSqFt?: number;
  bhk?: string; // "1 BHK", "2 BHK", "3 BHK", "4 BHK", "Plot"
  bathrooms?: number;
  balconies?: number;
  floor?: string; // "3rd of 7 Floors", "Ground Floor", "Duplex"
  furnishing?: 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';
  facing?: 'East' | 'North' | 'North-East' | 'West' | 'South';
  ageOfProperty?: string; // "Ready to Move", "Under Construction", "1-3 Years", "5+ Years"
  
  // Status & Legal
  status: PropertyStatus;
  isVerified: boolean;
  verificationBadge?: string;
  legalStatus: LegalAudit;
  
  // Features & Media
  amenities: string[];
  highlights: string[];
  images: string[];
  description: string;
  
  // Owner & Meta
  owner: PropertyOwner;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CallOutcome =
  | 'Interested'
  | 'Scheduled Visit'
  | 'Site Visit Fixed'
  | 'Follow-up Needed'
  | 'Ringing / No Answer'
  | 'Invalid Number'
  | 'Budget Mismatch'
  | 'Price Too High'
  | 'Already Sold'
  | 'Already Rented'
  | 'Bought Elsewhere'
  | 'Location Not Suitable'
  | 'Site Visit Done'
  | 'Requirement Closed'
  | 'Not Interested';

export interface CallLog {
  id: string;
  date: string;
  caller: string;
  notes: string;
  outcome: CallOutcome;
  nextFollowUpDate?: string;
}

export interface ScheduledVisit {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyLocality?: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  agent: string;
  feedback?: string;
}

export interface ResaleLead {
  id: string;
  leadCode: string; // e.g. "L-1042" or "RD-1042"
  leadNo?: number;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  
  // Demand vs Supply (Saraswati Nagri compatible)
  entity?: string; // 'Saraswati Nagri'
  intent: LeadIntent | string; // leads.property_type
  plotInterest?: string; // leads.plot_interest ('House/Villa', 'Flat', 'Plot', etc.)
  propertyCategory: PropertyCategory | 'any';
  bhkPreference: string[]; // ["2 BHK", "3 BHK"]
  preferredLocalities: string[]; // ["Besa", "Wardha Road"]
  purposeOfBuying?: string;
  
  // Budget
  budgetMin?: number;
  budgetMax?: number;
  budgetDisplay: string; // e.g. "₹45L - ₹65L" or "₹15k - ₹20k/mo"
  
  // Operational tracking
  timeline: 'immediate' | '15_days' | '1_month' | '3_months' | 'exploring';
  source: LeadSource | string;
  priority: LeadPriority;
  stage: LeadStage;
  rawStatus?: string; // Saraswati Nagri exact status ('New Inquiry', 'Follow-up', etc.)
  assignedTo: string;
  assignedToId?: string | null;
  nextFollowUp?: string;
  lastContactedAt?: string | null;
  interactionCount?: number;
  siteVisitDate?: string | null;
  aiScore?: number;
  aiReason?: string;
  notes: string;
  
  // Associated history
  callLogs: CallLog[];
  visits: ScheduledVisit[];
  interestedPropertyIds?: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  search: string;
  status?: string;
  locality?: string;
  category?: string;
  bhk?: string;
  transactionType?: string;
  priceRange?: [number, number];
  intent?: string;
  stage?: string;
  priority?: string;
  assignedTo?: string;
}

export interface MatchScore {
  property: ResaleProperty;
  score: number; // 0 to 100
  reasons: string[];
}

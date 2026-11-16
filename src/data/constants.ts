export const NAGPUR_LOCALITIES = [
  { name: 'Besa', corridor: 'South Nagpur / Manewada Belt' },
  { name: 'Wardha Road', corridor: 'MIHAN / Metro Corridor' },
  { name: 'Manish Nagar', corridor: 'South Nagpur' },
  { name: 'Somalwada', corridor: 'Wardha Road Belt' },
  { name: 'Narendra Nagar', corridor: 'South Nagpur' },
  { name: 'Hingna Road', corridor: 'MIDC / Hingna Belt' },
  { name: 'Koradi Road', corridor: 'North Nagpur / Ring Road' },
  { name: 'Godhani', corridor: 'North-West Corridor' },
  { name: 'Lonara', corridor: 'Koradi Highway' },
  { name: 'Shankarpur', corridor: 'Beltarodi Extension' },
  { name: 'Beltarodi', corridor: 'Airport / Besa Belt' },
  { name: 'Dharampeth', corridor: 'West Nagpur (Prime)' },
  { name: 'Ramdaspeth', corridor: 'Central-West Nagpur' },
  { name: 'Civil Lines', corridor: 'Central Administrative' },
  { name: 'Pratap Nagar', corridor: 'Ring Road South-West' },
  { name: 'Kamptee Road', corridor: 'North-East Corridor' },
  { name: 'Umred Road', corridor: 'South-East Growth Belt' },
  { name: 'Katol Road', corridor: 'North-West Nagpur' },
  { name: 'MIHAN', corridor: 'IT & Aerospace SEZ' }
] as const;

export const PROPERTY_CATEGORIES = [
  { value: 'flat', label: 'Apartment / Flat' },
  { value: 'house_villa', label: 'Independent House / Row House / Villa' },
  { value: 'plot', label: 'Residential Plot / Land (NMRDA / RL)' },
  { value: 'commercial', label: 'Commercial Shop / Office Space' },
  { value: 'farmhouse', label: 'Farmhouse / Agri Agro Land' }
] as const;

export const BHK_OPTIONS = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  '5+ BHK / Penthouse',
  'Plot / Open Land'
] as const;

export const FURNISHING_OPTIONS = [
  'Unfurnished',
  'Semi-Furnished',
  'Fully Furnished'
] as const;

export const FACING_OPTIONS = [
  'East',
  'North',
  'North-East',
  'West',
  'South',
  'North-West',
  'South-East'
] as const;

export const LEAD_STAGES = [
  { key: 'new', label: 'New Lead', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { key: 'contacted', label: 'In Contact / Qualified', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { key: 'visit_scheduled', label: 'Site Visit Scheduled', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { key: 'visit_done', label: 'Visit Completed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { key: 'negotiation', label: 'Negotiation / Price Offer', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { key: 'token_received', label: 'Token Paid / Booked', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { key: 'closed', label: 'Registry / Converted', color: 'bg-green-600 text-white border-green-600' },
  { key: 'lost', label: 'Lost / Dropped', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
] as const;

export const COMMON_AMENITIES = [
  'Covered Car Parking',
  'Elevator / Lift',
  '24x7 Security & Guard',
  'CCTV Surveillance',
  'Gated Layout / Boundary Wall',
  '24 Hours Water (Borewell + NMC)',
  'Power Backup / Inverter',
  'Children Play Area',
  'Club House & Gym',
  'Landscaped Garden',
  'Rainwater Harvesting',
  'Vastu Compliant',
  'Wide Tar / Cement Road',
  'Street Lights Installed'
];

export const SALES_AGENTS = [
  { id: 'agent-1', name: 'Nilesh Thakre (Resale Lead)', phone: '9822451080', role: 'Resale Desk Manager' },
  { id: 'agent-2', name: 'Prachi Ingle', phone: '9765123908', role: 'Senior Sales Executive' },
  { id: 'agent-3', name: 'Amit Deshmukh', phone: '9422894512', role: 'Property Consultant' },
  { id: 'agent-4', name: 'Snehal Bhoyar', phone: '9890451233', role: 'Client Relationship Executive' },
  { id: 'agent-5', name: 'Rahul Meshram', phone: '9370124890', role: 'Field Agent & Site Incharge' }
];


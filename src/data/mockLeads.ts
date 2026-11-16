import { ResaleLead } from '../types/crm';

export const INITIAL_LEADS: ResaleLead[] = [
  {
    id: 'lead-201',
    leadCode: 'RD-1001',
    name: 'Gajendra Bawankule',
    phone: '9822304910',
    whatsapp: '9822304910',
    email: 'gbawankule@gmail.com',
    intent: 'Wants to Buy a Property (Resale)',
    propertyCategory: 'flat',
    bhkPreference: ['3 BHK'],
    preferredLocalities: ['Besa', 'Manish Nagar', 'Wardha Road'],
    budgetMin: 5500000,
    budgetMax: 6800000,
    budgetDisplay: '₹55L - ₹68L',
    timeline: 'immediate',
    source: 'Website',
    priority: 'hot',
    stage: 'visit_scheduled',
    assignedTo: 'Nilesh Thakre (Resale Lead)',
    nextFollowUp: '2026-11-10T11:00:00Z',
    notes: 'Buyer works at TCS MIHAN. Looking strictly for a ready-to-move 3 BHK in Besa or Manish Nagar with lift & covered parking. Budget pre-approved from SBI.',
    callLogs: [
      {
        id: 'cl-1',
        date: '2026-11-08T15:30:00Z',
        caller: 'Nilesh Thakre',
        notes: 'Explained 3 BHK flat in Besa (prop-101). Client very impressed by location near Podar school.',
        outcome: 'Scheduled Visit'
      },
      {
        id: 'cl-2',
        date: '2026-11-06T11:00:00Z',
        caller: 'Snehal Bhoyar',
        notes: 'First qualifying call. Qualified budget to 65L. Needs ready possession by next month.',
        outcome: 'Interested'
      }
    ],
    visits: [
      {
        id: 'vis-1',
        propertyId: 'prop-101',
        propertyTitle: 'Spacious 3 BHK Garden View Flat in Besa',
        propertyLocality: 'Besa',
        date: '2026-11-10',
        time: '11:00 AM',
        status: 'scheduled',
        agent: 'Nilesh Thakre'
      }
    ],
    interestedPropertyIds: ['prop-101'],
    createdAt: '2026-11-05T10:15:00Z',
    updatedAt: '2026-11-08T15:35:00Z'
  },
  {
    id: 'lead-202',
    leadCode: 'RD-1002',
    name: 'Pooja Chawla',
    phone: '9764512033',
    whatsapp: '9764512033',
    email: 'pooja.chawla@infosys.com',
    intent: 'Wants to Buy a Property (Resale)',
    propertyCategory: 'flat',
    bhkPreference: ['2 BHK'],
    preferredLocalities: ['Manish Nagar', 'Somalwada'],
    budgetMin: 4000000,
    budgetMax: 5000000,
    budgetDisplay: '₹40L - ₹50L',
    timeline: '15_days',
    source: 'JustDial',
    priority: 'hot',
    stage: 'negotiation',
    assignedTo: 'Prachi Ingle',
    nextFollowUp: '2026-11-09T17:00:00Z',
    notes: 'Liked 2 BHK Manish Nagar flat (prop-102). Offered 45 Lakhs. Seller asking 46.5L. Trying to close at 45.5L today.',
    callLogs: [
      {
        id: 'cl-3',
        date: '2026-11-07T18:00:00Z',
        caller: 'Prachi Ingle',
        notes: 'Counter-offer discussed with Dr. Vivek Joshi. Meeting set for evening.',
        outcome: 'Interested'
      }
    ],
    visits: [
      {
        id: 'vis-2',
        propertyId: 'prop-102',
        propertyTitle: '2 BHK Semi-Furnished Apartment in Manish Nagar',
        propertyLocality: 'Manish Nagar',
        date: '2026-11-06',
        time: '04:30 PM',
        status: 'completed',
        agent: 'Prachi Ingle',
        feedback: 'Loved the room sizes and metro proximity.'
      }
    ],
    interestedPropertyIds: ['prop-102'],
    createdAt: '2026-11-02T14:20:00Z',
    updatedAt: '2026-11-08T18:10:00Z'
  },
  {
    id: 'lead-203',
    leadCode: 'RD-1003',
    name: 'Rajendra Kapse',
    phone: '9422839211',
    whatsapp: '9422839211',
    intent: 'Wants to Buy a Property (Resale)',
    propertyCategory: 'plot',
    bhkPreference: ['Plot / Open Land'],
    preferredLocalities: ['Wardha Road', 'MIHAN', 'Hingna Road'],
    budgetMin: 3000000,
    budgetMax: 4500000,
    budgetDisplay: '₹30L - ₹45L',
    timeline: '1_month',
    source: 'Walk-in',
    priority: 'warm',
    stage: 'contacted',
    assignedTo: 'Amit Deshmukh',
    nextFollowUp: '2026-11-11T12:00:00Z',
    notes: 'Retired government officer wanting an investment plot along Wardha Road or Hingna. Needs clear NMRDA sanction and RL. No litigation.',
    callLogs: [
      {
        id: 'cl-4',
        date: '2026-11-06T16:00:00Z',
        caller: 'Amit Deshmukh',
        notes: 'Shared Jamtha 1500 sqft plot details (prop-104) on WhatsApp. Client reviewing with son.',
        outcome: 'Follow-up Needed'
      }
    ],
    visits: [],
    interestedPropertyIds: ['prop-104'],
    createdAt: '2026-11-04T16:00:00Z',
    updatedAt: '2026-11-06T16:15:00Z'
  },
  {
    id: 'lead-204',
    leadCode: 'RD-1004',
    name: 'Harsh Vardhan Verma',
    phone: '9890781290',
    whatsapp: '9890781290',
    email: 'harsh.verma@wipro.com',
    intent: 'Wants to Rent a Property',
    propertyCategory: 'flat',
    bhkPreference: ['3 BHK'],
    preferredLocalities: ['Somalwada', 'Wardha Road', 'Manish Nagar'],
    budgetMin: 18000,
    budgetMax: 25000,
    budgetDisplay: '₹18k - ₹25k / mo',
    timeline: 'immediate',
    source: 'Direct Call',
    priority: 'hot',
    stage: 'visit_scheduled',
    assignedTo: 'Rahul Meshram',
    nextFollowUp: '2026-11-10T16:00:00Z',
    notes: 'Transferring from Pune to Nagpur next week. Needs 3 BHK rental flat near Metro / Wardha Road corridor.',
    callLogs: [],
    visits: [
      {
        id: 'vis-3',
        propertyId: 'prop-105',
        propertyTitle: '3 BHK High-Rise Flat for Rent in Somalwada',
        propertyLocality: 'Somalwada',
        date: '2026-11-10',
        time: '04:00 PM',
        status: 'scheduled',
        agent: 'Rahul Meshram'
      }
    ],
    interestedPropertyIds: ['prop-105'],
    createdAt: '2026-11-07T11:45:00Z',
    updatedAt: '2026-11-08T10:00:00Z'
  },
  {
    id: 'lead-205',
    leadCode: 'RD-1005',
    name: 'Manoj Tiwari',
    phone: '9823194050',
    whatsapp: '9823194050',
    intent: 'Wants to Sell Their Property (House/Villa/Farm)',
    propertyCategory: 'house_villa',
    bhkPreference: ['3 BHK'],
    preferredLocalities: ['Hingna Road'],
    budgetMin: 5000000,
    budgetMax: 5500000,
    budgetDisplay: '₹50L - ₹55L expected',
    timeline: '1_month',
    source: 'Referral',
    priority: 'warm',
    stage: 'new',
    assignedTo: 'Nilesh Thakre (Resale Lead)',
    nextFollowUp: '2026-11-09T15:30:00Z',
    notes: 'Has a 3 BHK row house in Hingna to sell. Requesting resale desk to visit for valuation and list on portal.',
    callLogs: [],
    visits: [],
    createdAt: '2026-11-08T09:15:00Z',
    updatedAt: '2026-11-08T09:15:00Z'
  }
];


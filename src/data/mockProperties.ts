import { ResaleProperty } from '../types/crm';

export const INITIAL_PROPERTIES: ResaleProperty[] = [
  {
    id: 'prop-101',
    title: 'Spacious 3 BHK Garden View Flat in Besa',
    transactionType: 'resale',
    category: 'flat',
    locality: 'Besa',
    corridor: 'South Nagpur / Manewada Belt',
    address: 'Near Pipla Fata, Ghogli Road, Besa, Nagpur',
    landmark: 'Behind Podar International School',
    mapsUrl: 'https://maps.google.com/?q=Besa+Nagpur',
    price: '₹62 Lakhs',
    priceNumeric: 6200000,
    ratePerSqFt: 4275,
    maintenanceMonthly: 2200,
    areaSqFt: 1450,
    carpetAreaSqFt: 1120,
    bhk: '3 BHK',
    bathrooms: 3,
    balconies: 2,
    floor: '4th of 8 Floors',
    furnishing: 'Semi-Furnished',
    facing: 'East',
    ageOfProperty: '2 Years (Ready to Move)',
    status: 'available',
    isVerified: true,
    verificationBadge: 'Verified Legal & Sanctioned',
    legalStatus: {
      nmrdaApproved: true,
      reraRegistered: true,
      reraNumber: 'P50500028912',
      rlAvailable: true,
      nitApproved: false,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Bank of Maharashtra']
    },
    amenities: [
      'Covered Car Parking',
      'Elevator / Lift',
      '24x7 Security & Guard',
      'Power Backup / Inverter',
      'Children Play Area',
      '24 Hours Water (Borewell + NMC)'
    ],
    highlights: [
      'Prime location in rapid-growth Besa corridor',
      'East facing, 100% Vastu compliant',
      'Modular kitchen & woodwork done in master bedroom',
      'SBI bank loan pre-approved'
    ],
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Immaculately maintained 3 BHK apartment in an upscale gated society at Besa. Features large balconies, cross ventilation, false ceiling with LED ambient lighting, modular kitchen, and reserved covered parking.',
    owner: {
      name: 'Sunil Wankhede',
      phone: '9822914580',
      whatsapp: '9822914580',
      negotiable: true,
      commissionPercent: 2,
      notes: 'Owner relocating to Pune. Keys available with caretaker on 2 hrs notice.'
    },
    createdAt: '2026-10-15T10:30:00Z',
    updatedAt: '2026-11-02T14:15:00Z'
  },
  {
    id: 'prop-102',
    title: '2 BHK Semi-Furnished Apartment in Manish Nagar',
    transactionType: 'resale',
    category: 'flat',
    locality: 'Manish Nagar',
    corridor: 'South Nagpur',
    address: 'Near Railway Crossing / Somalwada Link, Manish Nagar, Nagpur',
    landmark: 'Opposite Domino\'s Pizza',
    price: '₹46.5 Lakhs',
    priceNumeric: 4650000,
    ratePerSqFt: 4428,
    maintenanceMonthly: 1500,
    areaSqFt: 1050,
    carpetAreaSqFt: 820,
    bhk: '2 BHK',
    bathrooms: 2,
    balconies: 2,
    floor: '2nd of 5 Floors',
    furnishing: 'Semi-Furnished',
    facing: 'North',
    ageOfProperty: '4 Years',
    status: 'available',
    isVerified: true,
    verificationBadge: 'Clear Title / Loan Available',
    legalStatus: {
      nmrdaApproved: false,
      reraRegistered: true,
      reraNumber: 'P50500019244',
      rlAvailable: true,
      nitApproved: true,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: ['HDFC', 'SBI', 'Axis Bank']
    },
    amenities: [
      'Covered Car Parking',
      'Elevator / Lift',
      '24x7 Security & Guard',
      'CCTV Surveillance',
      '24 Hours Water (Borewell + NMC)'
    ],
    highlights: [
      '5 minutes to Metro Station (Airport & Ujjwal Nagar)',
      'High rental demand area (rent fetching ₹16k-18k/mo)',
      'Well connected to Wardha Road and Ring Road'
    ],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Prime 2 BHK resale unit in central Manish Nagar. Clean society with excellent water supply and active residents association. Ideal for nuclear families or investors seeking immediate rental returns.',
    owner: {
      name: 'Dr. Vivek Joshi',
      phone: '9422119842',
      whatsapp: '9422119842',
      negotiable: false,
      commissionPercent: 2,
      notes: 'Price slightly firm. Buyer can get immediate physical possession.'
    },
    createdAt: '2026-10-20T11:00:00Z',
    updatedAt: '2026-11-04T09:30:00Z'
  },
  {
    id: 'prop-103',
    title: 'Independent 4 BHK Luxury Duplex Villa in Shankarpur',
    transactionType: 'resale',
    category: 'house_villa',
    locality: 'Shankarpur',
    corridor: 'Beltarodi Extension',
    address: 'Plot 42, Royal Meadows, Shankarpur, Nagpur',
    landmark: 'Near D-Mart Beltarodi & Outer Ring Road',
    price: '₹98 Lakhs',
    priceNumeric: 9800000,
    ratePerSqFt: 4666,
    areaSqFt: 2100,
    carpetAreaSqFt: 1750,
    bhk: '4 BHK',
    bathrooms: 4,
    balconies: 3,
    floor: 'G + 1 Duplex with Private Terrace',
    furnishing: 'Fully Furnished',
    facing: 'East',
    ageOfProperty: '1 Year',
    status: 'under_discussion',
    isVerified: true,
    verificationBadge: 'Verified Legal & Sanctioned',
    legalStatus: {
      nmrdaApproved: true,
      reraRegistered: true,
      rlAvailable: true,
      nitApproved: false,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: ['SBI', 'HDFC', 'Bank of Baroda']
    },
    amenities: [
      'Covered Car Parking',
      'Gated Layout / Boundary Wall',
      'Club House & Gym',
      'Landscaped Garden',
      '24 Hours Water (Borewell + NMC)',
      'CCTV Surveillance'
    ],
    highlights: [
      'Private garden & rooftop gazebo',
      'Designer interior with branded fittings',
      'Gated premium layout with 30ft cement roads'
    ],
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Ultra-luxurious 4 BHK independent duplex bungalow located in a peaceful gated enclave in Shankarpur. Custom crafted with Italian marble, teakwood doors, solar water heating, and high-end sanitary ware.',
    owner: {
      name: 'Rajesh Agrawal',
      phone: '9823077651',
      whatsapp: '9823077651',
      negotiable: true,
      commissionPercent: 1.5,
      notes: 'Offers around 95L can be considered for fast token.'
    },
    createdAt: '2026-09-28T09:40:00Z',
    updatedAt: '2026-11-06T16:20:00Z'
  },
  {
    id: 'prop-104',
    title: '1500 Sq Ft NMRDA Sanctioned Corner Plot on Wardha Road',
    transactionType: 'resale',
    category: 'plot',
    locality: 'Wardha Road',
    corridor: 'MIHAN / Metro Corridor',
    address: 'Near Jamtha Stadium, Off Wardha Road Highway, Nagpur',
    landmark: 'Opposite VCA Stadium Entrance',
    price: '₹39 Lakhs',
    priceNumeric: 3900000,
    ratePerSqFt: 2600,
    areaSqFt: 1500,
    bhk: 'Plot / Open Land',
    facing: 'North-East',
    ageOfProperty: 'Ready to Move',
    status: 'available',
    isVerified: true,
    verificationBadge: 'NMRDA Sanctioned & RL in Hand',
    legalStatus: {
      nmrdaApproved: true,
      reraRegistered: true,
      reraNumber: 'P50500031022',
      rlAvailable: true,
      nitApproved: false,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: ['SBI', 'HDFC Bank', 'Canara Bank', 'Punjab National Bank']
    },
    amenities: [
      'Gated Layout / Boundary Wall',
      'Wide Tar / Cement Road',
      'Street Lights Installed',
      'Rainwater Harvesting'
    ],
    highlights: [
      'Two-side open corner plot with 40ft & 30ft road frontage',
      'Direct connectivity to Metro, Airport and MIHAN SEZ',
      'Immediate construction permitted with bank loan'
    ],
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Prestigious residential plot in a fully developed layout along the booming Wardha Road corridor. Includes clear title 7/12, demarcation stones, underground sewage, transformer electrification, and RL.',
    owner: {
      name: 'Mahendra Kulkarni',
      phone: '9890123478',
      whatsapp: '9890123478',
      negotiable: false,
      commissionPercent: 2,
      notes: 'All paperwork verified. Ready for immediate registry.'
    },
    createdAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-11-05T17:45:00Z'
  },
  {
    id: 'prop-105',
    title: '3 BHK High-Rise Flat for Rent in Somalwada',
    transactionType: 'rent',
    category: 'flat',
    locality: 'Somalwada',
    corridor: 'Wardha Road Belt',
    address: 'Tower B, Galaxy Enclave, Somalwada, Nagpur',
    landmark: 'Near Chhatrapati Square & Ring Road',
    price: '₹22,000 / month',
    priceNumeric: 22000,
    maintenanceMonthly: 2500,
    areaSqFt: 1350,
    carpetAreaSqFt: 1040,
    bhk: '3 BHK',
    bathrooms: 3,
    balconies: 2,
    floor: '6th of 11 Floors',
    furnishing: 'Semi-Furnished',
    facing: 'East',
    ageOfProperty: '3 Years',
    status: 'available',
    isVerified: true,
    verificationBadge: 'Verified Listing',
    legalStatus: {
      nmrdaApproved: false,
      reraRegistered: true,
      rlAvailable: true,
      nitApproved: true,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: []
    },
    amenities: [
      'Covered Car Parking',
      'Elevator / Lift',
      '24x7 Security & Guard',
      'Club House & Gym',
      'Power Backup / Inverter'
    ],
    highlights: [
      'Modular kitchen with chimney and piped gas line',
      'Ideal for IT professionals working in MIHAN or doctors'
    ],
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Well-appointed 3 BHK apartment available for immediate rent in Somalwada. Features wooden wardrobes in all bedrooms, LED lighting, water purifiers, and 1 reserved covered car parking.',
    owner: {
      name: 'Ashok Rao',
      phone: '9822471900',
      whatsapp: '9822471900',
      negotiable: true,
      notes: 'Family preferred. 2 months rent security deposit.'
    },
    createdAt: '2026-11-01T15:00:00Z',
    updatedAt: '2026-11-07T11:20:00Z'
  },
  {
    id: 'prop-106',
    title: 'Commercial Office Space on Koradi Road',
    transactionType: 'resale',
    category: 'commercial',
    locality: 'Koradi Road',
    corridor: 'North Nagpur / Ring Road',
    address: '3rd Floor, Shriram Business Square, Koradi Road, Nagpur',
    landmark: 'Near Mankapur Ring Road Square',
    price: '₹54 Lakhs',
    priceNumeric: 5400000,
    ratePerSqFt: 6350,
    areaSqFt: 850,
    bhk: '1 BHK',
    floor: '3rd of 6 Floors',
    furnishing: 'Fully Furnished',
    facing: 'North',
    ageOfProperty: '2 Years',
    status: 'available',
    isVerified: true,
    verificationBadge: 'Commercial Sanction Clear',
    legalStatus: {
      nmrdaApproved: true,
      reraRegistered: true,
      rlAvailable: true,
      nitApproved: true,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: ['Bank of Baroda', 'HDFC Bank']
    },
    amenities: [
      'Elevator / Lift',
      '24x7 Security & Guard',
      'CCTV Surveillance',
      'Power Backup / Inverter'
    ],
    highlights: [
      'Main road highway frontage with huge brand visibility',
      'Fully fitted with 14 workstations, manager cabin & conference'
    ],
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Turnkey plug-and-play commercial office suite located at a premier commercial building on Koradi Road. Comes with central AC ducting, glass partitions, server room, and attached pantry/washroom.',
    owner: {
      name: 'Nitin Gadkari Enterprises rep',
      phone: '9423108821',
      whatsapp: '9423108821',
      negotiable: true,
      commissionPercent: 2
    },
    createdAt: '2026-10-18T14:10:00Z',
    updatedAt: '2026-11-03T18:00:00Z'
  }
];


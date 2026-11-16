import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  MapPin, 
  IndianRupee, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Image as ImageIcon,
  User,
  Home,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Phone
} from 'lucide-react';
import { 
  ResaleProperty, 
  TransactionType, 
  PropertyCategory, 
  LegalAudit 
} from '../../types/crm';
import { 
  NAGPUR_LOCALITIES, 
  PROPERTY_CATEGORIES, 
  BHK_OPTIONS, 
  FURNISHING_OPTIONS, 
  FACING_OPTIONS, 
  COMMON_AMENITIES 
} from '../../data/constants';
import { formatIndianCurrency } from '../../utils/formatters';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProperty: (property: Omit<ResaleProperty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
}

// EXACT MULTI-STEPPER DEFINITIONS (MATCHING SARASWATI NAGRI CRM)
const STEPS = [
  { id: 1, label: 'Identity', color: 'amber' },
  { id: 2, label: 'Location', color: 'blue' },
  { id: 3, label: 'Commercials', color: 'emerald' },
  { id: 4, label: 'Specs', color: 'violet' },
  { id: 5, label: 'Legal Audit', color: 'teal' },
  { id: 6, label: 'Amenities', color: 'cyan' },
  { id: 7, label: 'Media', color: 'rose' },
  { id: 8, label: 'Owner Details', color: 'indigo' },
];

const SAMPLE_PRESET_IMAGES = [
  { label: 'Modern Apartment', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80' },
  { label: 'Luxury Villa / Row House', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80' },
  { label: 'NMRDA Sanctioned Plot', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80' },
  { label: 'Commercial Office Space', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80' }
];

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose,
  onSaveProperty
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Identity
  const [title, setTitle] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('resale');
  const [category, setCategory] = useState<PropertyCategory>('flat');

  // Step 2: Location
  const [locality, setLocality] = useState<string>(NAGPUR_LOCALITIES[0].name);
  const [corridor, setCorridor] = useState<string>(NAGPUR_LOCALITIES[0].corridor);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  // Step 3: Commercials
  const [priceNumeric, setPriceNumeric] = useState<number>(5500000);
  const [maintenanceMonthly, setMaintenanceMonthly] = useState<number>(1800);
  const [negotiable, setNegotiable] = useState(true);
  const [commissionPercent, setCommissionPercent] = useState<number>(2);

  // Step 4: Specifications
  const [areaSqFt, setAreaSqFt] = useState<number>(1250);
  const [carpetAreaSqFt, setCarpetAreaSqFt] = useState<number>(950);
  const [bhk, setBhk] = useState<string>('3 BHK');
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [balconies, setBalconies] = useState<number>(2);
  const [floor, setFloor] = useState('3rd of 7 Floors');
  const [furnishing, setFurnishing] = useState<'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished'>('Semi-Furnished');
  const [facing, setFacing] = useState<'East' | 'North' | 'North-East' | 'West' | 'South'>('East');
  const [ageOfProperty, setAgeOfProperty] = useState('Ready to Move');

  // Step 5: Legal Audit (propertiesnagpur.com 12-point check)
  const [nmrdaApproved, setNmrdaApproved] = useState(true);
  const [rlAvailable, setRlAvailable] = useState(true);
  const [reraRegistered, setReraRegistered] = useState(true);
  const [reraNumber, setReraNumber] = useState('');
  const [nitApproved, setNitApproved] = useState(false);
  const [clearTitle, setClearTitle] = useState(true);
  const [loanEligible, setLoanEligible] = useState(true);

  // Step 6: Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Covered Car Parking',
    'Elevator / Lift',
    '24x7 Security & Guard',
    '24 Hours Water (Borewell + NMC)'
  ]);

  // Step 7: Media
  const [coverImageUrl, setCoverImageUrl] = useState(SAMPLE_PRESET_IMAGES[0].url);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  // Step 8: Owner & Description
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [description, setDescription] = useState('');

  // Handle Locality change
  const handleLocalityChange = (locName: string) => {
    setLocality(locName);
    const hit = NAGPUR_LOCALITIES.find(l => l.name === locName);
    if (hit) setCorridor(hit.corridor);
  };

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step < STEPS.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // Intelligent fallbacks for any missing or optional fields
    const defaultTitle = category === 'plot'
      ? `Residential Plot in ${locality}`
      : `${bhk || '2/3 BHK'} ${category === 'house_villa' ? 'Villa / House' : 'Apartment'} in ${locality}`;
    const finalTitle = title.trim() || defaultTitle;
    const finalAddress = address.trim() || `${locality}, Nagpur, Maharashtra`;
    const finalPriceNumeric = Number(priceNumeric) > 0 ? Number(priceNumeric) : 0;
    const finalAreaSqFt = Number(areaSqFt) > 0 ? Number(areaSqFt) : 1000;
    const calculatedRatePerSqFt = finalAreaSqFt > 0 && finalPriceNumeric > 0 ? Math.round(finalPriceNumeric / finalAreaSqFt) : undefined;
    
    const formattedPrice = finalPriceNumeric > 0
      ? (transactionType === 'rent'
          ? `${formatIndianCurrency(finalPriceNumeric)} / month`
          : formatIndianCurrency(finalPriceNumeric))
      : 'Price on Request';

    const finalOwnerName = ownerName.trim() || 'Owner / Resale Desk';
    const finalOwnerPhone = ownerPhone.trim() || '';

    const legalAudit: LegalAudit = {
      nmrdaApproved,
      rlAvailable,
      reraRegistered,
      reraNumber: reraNumber.trim() || undefined,
      nitApproved,
      clearTitle,
      loanEligible,
      eligibleBanks: loanEligible ? ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Bank of Maharashtra'] : []
    };

    setIsSaving(true);
    try {
      await onSaveProperty({
        title: finalTitle,
        transactionType,
        category,
        locality: locality || 'Besa',
        corridor: corridor || 'South Nagpur',
        address: finalAddress,
        landmark: landmark.trim() || undefined,
        mapsUrl: mapsUrl.trim() || undefined,
        price: formattedPrice,
        priceNumeric: finalPriceNumeric,
        ratePerSqFt: calculatedRatePerSqFt,
        maintenanceMonthly: Number(maintenanceMonthly) || 0,
        areaSqFt: finalAreaSqFt,
        carpetAreaSqFt: Number(carpetAreaSqFt) || undefined,
        bhk: category === 'plot' ? 'Plot / Open Land' : (bhk || '3 BHK'),
        bathrooms: Number(bathrooms) || 2,
        balconies: Number(balconies) || 1,
        floor: floor.trim() || 'Floor Available',
        furnishing,
        facing,
        ageOfProperty: ageOfProperty.trim() || 'Ready to Move',
        status: 'available',
        isVerified: clearTitle && (nmrdaApproved || nitApproved || reraRegistered),
        verificationBadge: nmrdaApproved ? 'NMRDA Sanctioned & RL' : 'Clear Title Verified',
        legalStatus: legalAudit,
        amenities: selectedAmenities,
        highlights: [
          `Prime location in ${locality} corridor`,
          `${bhk || 'Property'} with ${facing} facing`,
          clearTitle ? 'Clear title with verified documents' : 'Paperwork in process',
          loanEligible ? 'Bank loan available from major nationalized banks' : ''
        ].filter(Boolean),
        images: [coverImageUrl, ...additionalImages].filter(Boolean),
        description: description.trim() || `${finalTitle} located at ${finalAddress}. Features ${finalAreaSqFt} sq.ft, ${facing} facing, verified title.`,
        owner: {
          name: finalOwnerName,
          phone: finalOwnerPhone,
          whatsapp: ownerWhatsapp.trim() || finalOwnerPhone,
          negotiable,
          commissionPercent: Number(commissionPercent) || 2,
          notes: ownerNotes.trim() || undefined
        }
      });
      setStep(1);
      setTitle('');
      onClose();
    } catch (err) {
      // Graceful fallback: do not block the modal
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Card (Saraswati Nagri Multi-Step Stepper) */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl z-10 overflow-hidden max-h-[92vh] flex flex-col text-xs">
        
        {/* Modal Header (Exact Saraswati Nagri CRM projects/client.tsx style) */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Register New Property</h2>
                <p className="text-xs font-semibold text-slate-600">
                  Step {step} of {STEPS.length} — {STEPS[step - 1].label}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar (Exact Saraswati Nagri CRM amber bars - Clickable) */}
          <div className="flex gap-1.5">
            {STEPS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setErrorMsg(''); setStep(s.id); }}
                title={`Step ${s.id}: ${s.label} (Click to jump)`}
                className={`h-2 flex-1 rounded-full transition-all duration-300 cursor-pointer ${
                  step >= s.id ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Form Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Property Title / Headline (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spacious 3 BHK Garden View Flat in Besa (Auto-generated if left blank)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    Deal Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransactionType('resale')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        transactionType === 'resale'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🏡 For Sale / Resale
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType('rent')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        transactionType === 'rent'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🔑 For Rent / Lease
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    Property Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PropertyCategory)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {PROPERTY_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    Nagpur Locality
                  </label>
                  <select
                    value={locality}
                    onChange={(e) => handleLocalityChange(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold"
                  >
                    {NAGPUR_LOCALITIES.map(loc => (
                      <option key={loc.name} value={loc.name}>{loc.name} ({loc.corridor})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    Corridor Belt
                  </label>
                  <input
                    type="text"
                    value={corridor}
                    onChange={(e) => setCorridor(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Detailed Address & Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Royal Residency, Near Pipla Fata, Besa, Nagpur"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Google Maps Location Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* STEP 3: COMMERCIALS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-800 uppercase block">Total Display Price:</span>
                  <span className="text-xl font-black text-teal-800">
                    {transactionType === 'rent' ? `${formatIndianCurrency(priceNumeric)} / month` : formatIndianCurrency(priceNumeric)}
                  </span>
                </div>
                {areaSqFt > 0 && (
                  <span className="text-xs text-teal-700 font-mono font-bold">
                    ≈ ₹{Math.round(priceNumeric / areaSqFt)} / sq.ft
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    {transactionType === 'rent' ? 'Monthly Rent (₹)' : 'Asking Price (₹) (Optional)'}
                  </label>
                  <input
                    type="number"
                    step="50000"
                    placeholder="e.g. 5500000 (0 for on request)"
                    value={priceNumeric}
                    onChange={(e) => setPriceNumeric(Number(e.target.value))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    Monthly Maintenance (₹)
                  </label>
                  <input
                    type="number"
                    value={maintenanceMonthly}
                    onChange={(e) => setMaintenanceMonthly(Number(e.target.value))}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    Brokerage (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={negotiable}
                  onChange={(e) => setNegotiable(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span className="text-xs font-semibold text-slate-700">Price is negotiable for serious / ready buyers</span>
              </label>
            </div>
          )}

          {/* STEP 4: SPECS */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Super Area (sq.ft) (Optional)</label>
                  <input
                    type="number"
                    value={areaSqFt}
                    onChange={(e) => setAreaSqFt(Number(e.target.value))}
                    className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Carpet Area (sq.ft)</label>
                  <input
                    type="number"
                    value={carpetAreaSqFt}
                    onChange={(e) => setCarpetAreaSqFt(Number(e.target.value))}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Configuration</label>
                  <select
                    value={bhk}
                    onChange={(e) => setBhk(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                  >
                    {BHK_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Facing</label>
                  <select
                    value={facing}
                    onChange={(e) => setFacing(e.target.value as any)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                  >
                    {FACING_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Furnishing</label>
                  <select
                    value={furnishing}
                    onChange={(e) => setFurnishing(e.target.value as any)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                  >
                    {FURNISHING_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Floor Details</label>
                  <input
                    type="text"
                    placeholder="e.g. 3rd of 7 Floors"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Bathrooms</label>
                  <input
                    type="number"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Possession</label>
                  <input
                    type="text"
                    value={ageOfProperty}
                    onChange={(e) => setAgeOfProperty(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: LEGAL AUDIT (PROPERTIES NAGPUR 12-POINT AUDIT) */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs">
                <strong>Nagpur Real Estate Legal Verification Standard:</strong> Check all approvals in hand for buyer loan processing.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={nmrdaApproved}
                    onChange={(e) => setNmrdaApproved(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>NMRDA Sanctioned Layout</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={rlAvailable}
                    onChange={(e) => setRlAvailable(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>Release Letter (RL in Hand)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={clearTitle}
                    onChange={(e) => setClearTitle(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>7/12 & Khasra Clear Title</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={reraRegistered}
                    onChange={(e) => setReraRegistered(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>MahaRERA Registered</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={nitApproved}
                    onChange={(e) => setNitApproved(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>NIT / NMC Sanctioned</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={loanEligible}
                    onChange={(e) => setLoanEligible(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>Nationalized Bank Loan Eligible (SBI, HDFC)</span>
                </label>
              </div>

              {reraRegistered && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                    MahaRERA Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. P50500031022"
                    value={reraNumber}
                    onChange={(e) => setReraNumber(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 6: AMENITIES */}
          {step === 6 && (
            <div className="space-y-3 animate-in fade-in">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                Select Layout & Building Amenities:
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                {COMMON_AMENITIES.map(amenity => (
                  <button
                    type="button"
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedAmenities.includes(amenity)
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {selectedAmenities.includes(amenity) ? '✓ ' : '+ '}{amenity}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: MEDIA */}
          {step === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Quick Photo Presets:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {SAMPLE_PRESET_IMAGES.map(preset => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setCoverImageUrl(preset.url)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">
                  Cover Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                />
              </div>

              {coverImageUrl && (
                <div className="h-40 w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* STEP 8: OWNER & DESCRIPTION */}
          {step === 8 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Owner Full Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunil Wankhede (or desk listing)"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Owner Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9822914580"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Key Viewing / Private Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Keys with society guard / caretaker on 2 hrs notice"
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Marketing description for client proposals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-sm font-medium border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Stepper Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            {step === 1 ? 'Cancel' : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {step < STEPS.length && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleFinalSubmit()}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                title="Save immediately with current information"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quick Save</span>
              </button>
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleFinalSubmit()}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Registering...' : 'Publish Property'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

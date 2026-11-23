import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Phone,
  Upload,
  Trash2,
  Star,
  FolderUp,
  Link as LinkIcon,
  Tag as TagIcon,
  Camera,
  Check,
  Loader2,
  FileText,
  MessageSquare,
  Zap,
  ArrowDown,
  Search,
  RefreshCw,
  Smartphone,
  QrCode,
  ExternalLink
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
import { formatIndianCurrency, generateWhatsAppLink } from '../../utils/formatters';
import { 
  OptimizedImage, 
  PHOTO_LABELS, 
  processMultipleImageFiles 
} from '../../utils/imageUpload';
import { parseWhatsAppPropertyMessage } from '../../utils/whatsappPropertyParser';
import {
  fetchRecentInboundPropertyMessages,
  WhatsAppInboundPropertyMessage,
  fetchWhatsAppSessions,
  WhatsAppSession
} from '../../services/whatsappService';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProperty: (property: Omit<ResaleProperty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  initialPrefill?: Partial<ResaleProperty> | null;
  defaultOpenWhatsAppImport?: boolean;
  onOpenWhatsAppConnect?: () => void;
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
  onSaveProperty,
  initialPrefill,
  defaultOpenWhatsAppImport = false,
  onOpenWhatsAppConnect
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // WhatsApp Message Fast-Importer State
  const [isWhatsAppImporterOpen, setIsWhatsAppImporterOpen] = useState(Boolean(defaultOpenWhatsAppImport || initialPrefill));
  const [whatsappImportTab, setWhatsappImportTab] = useState<'direct' | 'paste'>('direct');
  const [inboundMessages, setInboundMessages] = useState<WhatsAppInboundPropertyMessage[]>([]);
  const [isLoadingInbound, setIsLoadingInbound] = useState(false);
  const [activeSession, setActiveSession] = useState<WhatsAppSession | null>(null);
  const [searchInboundTerm, setSearchInboundTerm] = useState('');
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(null);
  const [whatsappRawText, setWhatsappRawText] = useState('');
  const [parseNotice, setParseNotice] = useState<{ message: string; tone: 'ok' | 'info' | 'warn' } | null>(null);

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

  // Step 7: Media & Property Photos (Upload from Device / Drive + URLs + Presets)
  const [coverImageUrl, setCoverImageUrl] = useState(SAMPLE_PRESET_IMAGES[0].url);
  const [galleryImages, setGalleryImages] = useState<OptimizedImage[]>([
    {
      id: 'default-cover',
      url: SAMPLE_PRESET_IMAGES[0].url,
      name: 'Modern Apartment (Sample)',
      sizeKb: 140,
      label: 'Building Elevation'
    }
  ]);
  const [mediaSourceTab, setMediaSourceTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [pastedUrl, setPastedUrl] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Step 8: Owner & Description
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [description, setDescription] = useState('');

  // Initialize or prefill from props
  useEffect(() => {
    if (initialPrefill) {
      if (initialPrefill.title) setTitle(initialPrefill.title);
      if (initialPrefill.transactionType) setTransactionType(initialPrefill.transactionType);
      if (initialPrefill.category) setCategory(initialPrefill.category);
      if (initialPrefill.locality) {
        setLocality(initialPrefill.locality);
        const hit = NAGPUR_LOCALITIES.find(l => l.name === initialPrefill.locality);
        if (hit) setCorridor(hit.corridor);
      }
      if (initialPrefill.corridor) setCorridor(initialPrefill.corridor);
      if (initialPrefill.address) setAddress(initialPrefill.address);
      if (initialPrefill.priceNumeric) setPriceNumeric(initialPrefill.priceNumeric);
      if (initialPrefill.areaSqFt) setAreaSqFt(initialPrefill.areaSqFt);
      if (initialPrefill.carpetAreaSqFt) setCarpetAreaSqFt(initialPrefill.carpetAreaSqFt);
      if (initialPrefill.bhk) setBhk(initialPrefill.bhk);
      if (initialPrefill.facing) setFacing(initialPrefill.facing);
      if (initialPrefill.furnishing) setFurnishing(initialPrefill.furnishing);
      if (initialPrefill.description) setDescription(initialPrefill.description);

      if (initialPrefill.owner) {
        if (initialPrefill.owner.name) setOwnerName(initialPrefill.owner.name);
        if (initialPrefill.owner.phone) setOwnerPhone(initialPrefill.owner.phone);
        if (initialPrefill.owner.whatsapp) setOwnerWhatsapp(initialPrefill.owner.whatsapp);
        if (initialPrefill.owner.notes) setOwnerNotes(initialPrefill.owner.notes);
      }

      if (initialPrefill.legalStatus) {
        if (typeof initialPrefill.legalStatus.nmrdaApproved === 'boolean') setNmrdaApproved(initialPrefill.legalStatus.nmrdaApproved);
        if (typeof initialPrefill.legalStatus.rlAvailable === 'boolean') setRlAvailable(initialPrefill.legalStatus.rlAvailable);
        if (typeof initialPrefill.legalStatus.reraRegistered === 'boolean') setReraRegistered(initialPrefill.legalStatus.reraRegistered);
        if (typeof initialPrefill.legalStatus.clearTitle === 'boolean') setClearTitle(initialPrefill.legalStatus.clearTitle);
      }

      setParseNotice({
        message: `Prefilled from WhatsApp lead: ${initialPrefill.owner?.name || 'Contact'} (${initialPrefill.locality || 'Nagpur'})`,
        tone: 'info'
      });
    }
  }, [initialPrefill]);

  // Load live inbound WhatsApp messages from CRM line
  const loadInboundMessages = useCallback(async () => {
    setIsLoadingInbound(true);
    try {
      const [{ messages }, { activeSession: session }] = await Promise.all([
        fetchRecentInboundPropertyMessages(),
        fetchWhatsAppSessions()
      ]);
      setInboundMessages(messages);
      setActiveSession(session);
    } catch (err) {
      console.warn('Error loading inbound WhatsApp messages:', err);
    } finally {
      setIsLoadingInbound(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadInboundMessages();
    }
  }, [isOpen, loadInboundMessages]);

  const filteredInboundMessages = useMemo(() => {
    return inboundMessages.filter((m) => {
      const q = searchInboundTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        m.text.toLowerCase().includes(q) ||
        (m.pushName || '').toLowerCase().includes(q) ||
        m.fromNumber.includes(q) ||
        (m.locality || '').toLowerCase().includes(q) ||
        (m.bhk || '').toLowerCase().includes(q)
      );
    });
  }, [inboundMessages, searchInboundTerm]);

  // Execute WhatsApp message auto-parse and form field population
  const handleParseWhatsAppText = (rawMsg: string, senderName?: string, senderPhone?: string) => {
    if (!rawMsg || !rawMsg.trim()) {
      setParseNotice({ message: 'Please select or paste a WhatsApp message first.', tone: 'warn' });
      return;
    }

    const result = parseWhatsAppPropertyMessage(rawMsg);
    const { extractedFields, confidenceScore } = result;

    if (confidenceScore === 0) {
      setParseNotice({
        message: 'Could not extract property details from this text. Please check the text or enter manually.',
        tone: 'warn'
      });
      return;
    }

    // Apply extracted fields
    if (extractedFields.title) setTitle(extractedFields.title);
    if (extractedFields.category) setCategory(extractedFields.category);
    if (extractedFields.transactionType) setTransactionType(extractedFields.transactionType);
    if (extractedFields.locality) {
      setLocality(extractedFields.locality);
      const hit = NAGPUR_LOCALITIES.find(l => l.name === extractedFields.locality);
      if (hit) setCorridor(hit.corridor);
    }
    if (extractedFields.corridor) setCorridor(extractedFields.corridor);
    if (extractedFields.address) setAddress(extractedFields.address);
    if (extractedFields.priceNumeric && extractedFields.priceNumeric > 0) setPriceNumeric(extractedFields.priceNumeric);
    if (extractedFields.areaSqFt && extractedFields.areaSqFt > 0) {
      setAreaSqFt(extractedFields.areaSqFt);
      setCarpetAreaSqFt(Math.round(extractedFields.areaSqFt * 0.76));
    }
    if (extractedFields.bhk) setBhk(extractedFields.bhk);
    if (extractedFields.facing) setFacing(extractedFields.facing);
    if (extractedFields.furnishing) setFurnishing(extractedFields.furnishing);

    const finalOwnerName = extractedFields.ownerName || senderName || '';
    if (finalOwnerName) setOwnerName(finalOwnerName);

    const finalPhone = extractedFields.ownerPhone || senderPhone || '';
    if (finalPhone) {
      setOwnerPhone(finalPhone);
      setOwnerWhatsapp(finalPhone);
    }

    if (extractedFields.legalStatus) {
      if (typeof extractedFields.legalStatus.nmrdaApproved === 'boolean') setNmrdaApproved(extractedFields.legalStatus.nmrdaApproved);
      if (typeof extractedFields.legalStatus.rlAvailable === 'boolean') setRlAvailable(extractedFields.legalStatus.rlAvailable);
      if (typeof extractedFields.legalStatus.reraRegistered === 'boolean') setReraRegistered(extractedFields.legalStatus.reraRegistered);
      if (typeof extractedFields.legalStatus.clearTitle === 'boolean') setClearTitle(extractedFields.legalStatus.clearTitle);
    }

    // Preserve original message in notes / description
    if (!description) {
      setDescription(`WhatsApp Source Listing:\n${rawMsg.trim()}`);
    }

    const summaryParts: string[] = [];
    if (extractedFields.bhk && extractedFields.category !== 'plot') summaryParts.push(extractedFields.bhk);
    if (extractedFields.category) summaryParts.push(extractedFields.category.toUpperCase());
    if (extractedFields.locality) summaryParts.push(extractedFields.locality);
    if (extractedFields.areaSqFt) summaryParts.push(`${extractedFields.areaSqFt} sq.ft`);
    if (extractedFields.price) summaryParts.push(extractedFields.price);
    if (finalPhone) summaryParts.push(`Ph: ${finalPhone}`);

    setParseNotice({
      message: `Directly inserted from WhatsApp (${confidenceScore}% match): ${summaryParts.join(' · ')}. Review details in the 8 steps below!`,
      tone: 'ok'
    });
  };

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

  // Image Upload Handlers
  const handleDeviceFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    setUploadProgressText(`Optimizing ${files.length} property photos...`);

    try {
      const optimizedImages = await processMultipleImageFiles(files, (done, total) => {
        setUploadProgressText(`Optimizing photo ${done} of ${total}...`);
      });

      if (optimizedImages.length > 0) {
        // If current gallery only has the default preset, replace it with the first real photo uploaded
        const hasOnlyDefault = galleryImages.length === 1 && galleryImages[0].id === 'default-cover';
        if (hasOnlyDefault) {
          setCoverImageUrl(optimizedImages[0].url);
          setGalleryImages(optimizedImages);
        } else {
          setGalleryImages(prev => [...prev, ...optimizedImages]);
        }
      }
    } catch (err) {
      setErrorMsg('Failed to process one or more images from device.');
    } finally {
      setIsProcessingFiles(false);
      setUploadProgressText('');
      e.target.value = ''; // Reset input to allow re-uploading same file
    }
  };

  const handleAddPastedUrl = () => {
    if (!pastedUrl.trim()) return;
    const newImg: OptimizedImage = {
      id: `url-${Date.now()}`,
      url: pastedUrl.trim(),
      name: 'External Image Link',
      sizeKb: 0,
      label: 'General View'
    };
    setGalleryImages(prev => [...prev, newImg]);
    if (!coverImageUrl) setCoverImageUrl(newImg.url);
    setPastedUrl('');
  };

  const handleSelectPreset = (url: string, label: string) => {
    const newImg: OptimizedImage = {
      id: `preset-${Date.now()}`,
      url,
      name: label,
      sizeKb: 120,
      label: 'Building Elevation'
    };
    setCoverImageUrl(url);
    setGalleryImages(prev => [newImg, ...prev.filter(x => x.id !== 'default-cover')]);
  };

  const handleSetCover = (url: string) => {
    setCoverImageUrl(url);
  };

  const handleRemoveImage = (id: string) => {
    const target = galleryImages.find(img => img.id === id);
    const updated = galleryImages.filter(img => img.id !== id);
    setGalleryImages(updated);
    if (target && target.url === coverImageUrl && updated.length > 0) {
      setCoverImageUrl(updated[0].url);
    }
  };

  const handleUpdateImageLabel = (id: string, label: string) => {
    setGalleryImages(prev =>
      prev.map(img => (img.id === id ? { ...img, label } : img))
    );
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
        images: (() => {
          const combined = [
            coverImageUrl,
            ...galleryImages.map(img => img.url).filter(u => u !== coverImageUrl)
          ].filter(Boolean);
          return combined.length > 0 ? combined : [SAMPLE_PRESET_IMAGES[0].url];
        })(),
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Card (Saraswati Nagri Multi-Step Stepper) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl z-10 overflow-hidden max-h-[96vh] sm:max-h-[92vh] flex flex-col text-xs">
        
        {/* Modal Header (Exact Saraswati Nagri CRM projects/client.tsx style) */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40 shrink-0">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-800">Register New Property</h2>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
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
          <div className="flex gap-1 sm:gap-1.5">
            {STEPS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setErrorMsg(''); setStep(s.id); }}
                title={`Step ${s.id}: ${s.label} (Click to jump)`}
                className={`h-1.5 sm:h-2 flex-1 rounded-full transition-all duration-300 cursor-pointer ${
                  step >= s.id ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Form Step Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FAST AUTO-FILL FROM DIRECT WHATSAPP & AI INGESTION CENTER */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white p-3.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <span>Direct WhatsApp Property Ingestion</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded">
                      Fast 1-Click
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Pick incoming WhatsApp messages from buyers/brokers directly or paste listing text
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/90 border border-emerald-200 rounded-xl p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWhatsAppImporterOpen(true);
                      setWhatsappImportTab('direct');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      whatsappImportTab === 'direct' && isWhatsAppImporterOpen
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-800 hover:text-emerald-950'
                    }`}
                  >
                    📲 Direct WhatsApp Chats
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWhatsAppImporterOpen(true);
                      setWhatsappImportTab('paste');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      whatsappImportTab === 'paste' && isWhatsAppImporterOpen
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-800 hover:text-emerald-950'
                    }`}
                  >
                    📋 Paste Raw Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWhatsAppImporterOpen(!isWhatsAppImporterOpen)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded-lg bg-white/90 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                >
                  {isWhatsAppImporterOpen ? 'Hide' : 'Expand ↓'}
                </button>
              </div>
            </div>

            {isWhatsAppImporterOpen && (
              <div className="mt-3 pt-3 border-t border-emerald-200/70 space-y-3 animate-in fade-in">
                {/* Connection Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white/80 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-700">
                      CRM WhatsApp Line: <span className="text-emerald-700 font-extrabold">+91 89560 40220</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      Listening
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadInboundMessages}
                      disabled={isLoadingInbound}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Refresh WhatsApp messages"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingInbound ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>Refresh</span>
                    </button>

                    <a
                      href="https://wa.me/918956040220?text=Forward%20property%20listing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Forward to CRM</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    {onOpenWhatsAppConnect && (
                      <button
                        type="button"
                        onClick={onOpenWhatsAppConnect}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3 h-3 text-slate-500" />
                        <span>Pair / QR</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* TAB 1: DIRECT FROM WHATSAPP CHATS */}
                {whatsappImportTab === 'direct' && (
                  <div className="space-y-2.5">
                    {/* Search WhatsApp Messages */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search incoming WhatsApp messages by locality, BHK, or phone..."
                        value={searchInboundTerm}
                        onChange={(e) => setSearchInboundTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                      />
                    </div>

                    {/* Messages Scrollable List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {isLoadingInbound ? (
                        <div className="py-8 text-center text-slate-400 space-y-1.5">
                          <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-500" />
                          <p className="text-xs font-semibold">Fetching recent WhatsApp property listings...</p>
                        </div>
                      ) : filteredInboundMessages.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 space-y-1">
                          <p className="font-semibold text-xs text-slate-600">No matching WhatsApp messages found.</p>
                          <p className="text-[11px] text-slate-400">
                            Try searching a different keyword or forward a listing to +91 89560 40220.
                          </p>
                        </div>
                      ) : (
                        filteredInboundMessages.map((msg) => {
                          const ext = msg.parsed.extractedFields;
                          const isSelected = selectedInboundId === msg.id;

                          return (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-xl border transition-all text-xs ${
                                isSelected
                                  ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                                  : 'bg-white hover:bg-emerald-50/30 border-emerald-100 hover:border-emerald-200 shadow-2xs'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-[11px]">
                                    {msg.pushName || 'WhatsApp Contact'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    ({msg.formattedFromNumber})
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    · {msg.relativeTime}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>{msg.confidenceScore}% Match</span>
                                  </span>
                                </div>
                              </div>

                              {/* Message Snippet */}
                              <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 leading-relaxed whitespace-pre-line font-normal">
                                {msg.text}
                              </p>

                              {/* Detected Attributes Bar & 1-Click Action */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-700">
                                  {ext.bhk && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                      {ext.bhk}
                                    </span>
                                  )}
                                  {ext.locality && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded">
                                      📍 {ext.locality}
                                    </span>
                                  )}
                                  {ext.price && (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                                      💰 {ext.price}
                                    </span>
                                  )}
                                  {ext.areaSqFt && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                                      📐 {ext.areaSqFt} sq.ft
                                    </span>
                                  )}
                                  {ext.legalStatus?.nmrdaApproved && (
                                    <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded">
                                      ⚖️ NMRDA &amp; RL
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInboundId(msg.id);
                                    handleParseWhatsAppText(msg.text, msg.pushName, msg.fromNumber);
                                  }}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-700 text-white shadow-2xs'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                >
                                  <Zap className="w-3 h-3 fill-current" />
                                  <span>{isSelected ? '✓ Inserted' : '⚡ 1-Click Insert'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: PASTE RAW TEXT (MANUAL FALLBACK) */}
                {whatsappImportTab === 'paste' && (
                  <div className="space-y-2.5">
                    <textarea
                      rows={3}
                      value={whatsappRawText}
                      onChange={(e) => setWhatsappRawText(e.target.value)}
                      placeholder="Paste WhatsApp message here... e.g. 'Plot for sale in Besa Nagpur, 1500 sqft, East facing, RL Approved, demand 55 Lakhs. Contact Mr. Sharma 9823012345'"
                      className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleParseWhatsAppText(whatsappRawText)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Parse &amp; Auto-fill Form</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const sample = '3 BHK Flat for sale in Manish Nagar near Besa Square, 1450 sqft super builtup, East facing, Semi Furnished, 2nd floor, Lift, Car Parking, RL and NMRDA approved, Clear title. Demand 68 Lakhs negotiable. Owner: Ramesh Agrawal 9890123456';
                            setWhatsappRawText(sample);
                            handleParseWhatsAppText(sample);
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          Insert Sample Message
                        </button>
                      </div>

                      {whatsappRawText && (
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappRawText('');
                            setParseNotice(null);
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                        >
                          Clear Text
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Shared Parse Notice */}
                {parseNotice && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in ${
                      parseNotice.tone === 'ok'
                        ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                        : parseNotice.tone === 'info'
                        ? 'bg-blue-50 text-blue-900 border-blue-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span className="flex-1">{parseNotice.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* STEP 7: MEDIA & PROPERTY PHOTOS */}
          {step === 7 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Media Option Segmented Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMediaSourceTab('upload')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaSourceTab === 'upload'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderUp className="w-3.5 h-3.5 text-rose-500" />
                  <span>Upload from Device / Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaSourceTab('url')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaSourceTab === 'url'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-teal-600" />
                  <span>Image URL / Cloud Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaSourceTab('presets')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaSourceTab === 'presets'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quick Presets</span>
                </button>
              </div>

              {/* TAB 1: DEVICE / DRIVE UPLOAD DROPZONE */}
              {mediaSourceTab === 'upload' && (
                <div className="space-y-3">
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/20 rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100/70 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FolderUp className="w-6 h-6" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Drop property photos here or click to browse
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload elevation, living hall, bedrooms, kitchen, or NMRDA layout sheet
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        id="property-device-upload"
                        onChange={handleDeviceFilesUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="property-device-upload"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-rose-400" />
                        <span>Choose from Device / Drive</span>
                      </label>

                      {/* Mobile camera snap option */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        id="property-camera-upload"
                        onChange={handleDeviceFilesUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="property-camera-upload"
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 shadow-sm transition-all"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Camera Capture</span>
                      </label>
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1">
                      Supports JPG, PNG, WEBP · Auto-compressed for rapid WhatsApp & brochure loading
                    </span>
                  </div>

                  {isProcessingFiles && (
                    <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
                      <span>{uploadProgressText || 'Compressing & preparing photos...'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: URL / CLOUD LINK */}
              {mediaSourceTab === 'url' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                    Paste Image Link or Cloud URL (Google Drive / Dropbox / Web)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or Google Drive direct link"
                      value={pastedUrl}
                      onChange={(e) => setPastedUrl(e.target.value)}
                      className="flex-1 p-2.5 text-xs font-medium border border-slate-200 rounded-xl font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddPastedUrl}
                      disabled={!pastedUrl.trim()}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      Add Photo
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: QUICK PRESETS */}
              {mediaSourceTab === 'presets' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                    Select Curated Nagpur Real Estate Representative Preset:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SAMPLE_PRESET_IMAGES.map((preset) => (
                      <button
                        type="button"
                        key={preset.label}
                        onClick={() => handleSelectPreset(preset.url, preset.label)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                          coverImageUrl === preset.url
                            ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="h-16 w-full rounded-lg overflow-hidden bg-slate-100">
                          <img src={preset.url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 truncate block">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* GALLERY MANAGEMENT & PHOTO LIST */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">
                      Property Gallery ({galleryImages.length} {galleryImages.length === 1 ? 'photo' : 'photos'})
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Cover selected
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Click "Set Cover" to change listing thumbnail
                  </span>
                </div>

                {galleryImages.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 text-xs">
                    No photos added yet. Upload files from device or choose a preset above.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                    {galleryImages.map((img) => {
                      const isCover = coverImageUrl === img.url;
                      return (
                        <div
                          key={img.id}
                          className={`relative group rounded-xl border overflow-hidden bg-white shadow-sm transition-all flex flex-col ${
                            isCover ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200'
                          }`}
                        >
                          <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                            <img src={img.url} alt="" className="h-full w-full object-cover" />

                            {/* Cover Badge or Set-Cover button */}
                            {isCover ? (
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-white shadow-md flex items-center gap-1">
                                <Star className="w-3 h-3 fill-white" />
                                <span>Cover</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetCover(img.url)}
                                className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 hover:bg-amber-600 text-white backdrop-blur-sm transition-all cursor-pointer"
                              >
                                Set Cover
                              </button>
                            )}

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id)}
                              title="Remove photo"
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            {/* File size badge if present */}
                            {img.sizeKb > 0 && (
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-mono bg-black/60 text-white backdrop-blur-sm">
                                {img.sizeKb} KB
                              </span>
                            )}
                          </div>

                          {/* Image Label / Category selector */}
                          <div className="p-1.5 bg-slate-50 border-t border-slate-100">
                            <select
                              value={img.label || 'General View'}
                              onChange={(e) => handleUpdateImageLabel(img.id, e.target.value)}
                              className="w-full text-[10px] font-bold p-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                            >
                              {PHOTO_LABELS.map((lbl) => (
                                <option key={lbl} value={lbl}>
                                  {lbl}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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

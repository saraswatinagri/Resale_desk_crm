import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Loader2,
  CheckCheck,
  Languages,
  Clock3,
  ExternalLink,
  Tag,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  FileText,
  MapPin,
  FileCheck2,
  ReceiptIndianRupee,
  PlusSquare,
  Check,
} from 'lucide-react';
import {
  fetchLeadWhatsAppMessages,
  sendLeadWhatsAppMessage,
  fetchWhatsAppSessions,
  type WhatsAppMessageItem,
  type WhatsAppSession,
} from '../../services/whatsappService';
import { supabaseDb } from '../../lib/supabase';
import { toast } from '../../utils/toast';
import { parseWhatsAppPropertyMessage } from '../../utils/whatsappPropertyParser';
import {
  generateGeminiRealEstateReply,
} from '../../services/geminiService';
import type { ResaleProperty, ResaleLead } from '../../types/crm';

export type WaLanguage = 'Hindi' | 'Marathi' | 'English';

export interface LeadWhatsAppWindowProps {
  leadName: string;
  leadId: string;
  phone: string;
  stage?: string;
  projectName?: string;
  preferredLanguage?: WaLanguage;
  onClose: () => void;
  onConnect: () => void;
  variant?: 'overlay' | 'panel';
  onConvertToProperty?: (prefill: Partial<ResaleProperty>) => void;
  properties?: ResaleProperty[];
  lead?: ResaleLead;
  /** Prefill the composer (property pitch, quick reply) without leaving the CRM. */
  initialDraft?: string | null;
}

const IST = 'Asia/Kolkata';

function dayKey(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });
  } catch {
    return iso.split('T')[0] || '';
  }
}

function dayLabel(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
    const yesterday = new Date(now.getTime() - 86400000);
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
    return date.toLocaleDateString('en-IN', {
      timeZone: IST,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface QuickChip {
  id: string;
  label: string;
  icon: any;
  templates: Record<WaLanguage, string>;
}

const QUICK_CHIPS: QuickChip[] = [
  {
    id: 'intro',
    label: 'Resale Intro',
    icon: Sparkles,
    templates: {
      Hindi: 'नमस्ते {name} जी! मैं सरस्वती नगरी / नागपुर प्रॉपर्टीज रिसेल डेस्क से बात कर रहा हूँ। आपने रिसेल प्रॉपर्टी में रुचि दिखाई थी। क्या मैं आपको उपलब्ध ऑप्शंस शेयर करूँ?',
      Marathi: 'नमस्कार {name} जी! मी सरस्वती नगरी / नागपूर प्रॉपर्टीज रिसेल डेस्कवरून बोलत आहे. आपण रिसेल प्रॉपर्टी शोधत होता. आपल्यासाठी उपलब्ध प्लॉट्सचे तपशील पाठवू का?',
      English: 'Hello {name}, greetings from Saraswati Nagri / Nagpur Properties Resale Desk. Regarding your property requirement, would you like to review our verified listings?',
    },
  },
  {
    id: 'visit',
    label: 'Site Visit',
    icon: Calendar,
    templates: {
      Hindi: 'नमस्ते {name} जी! इस वीकेंड पर हम साइट विजिट प्लान कर रहे हैं। आपके लिए शनिवार या रविवार में कौन सा समय सुविधाजनक रहेगा?',
      Marathi: 'नमस्कार {name} जी! या शनिवार किंवा रविवारी आम्ही प्रत्यक्ष साईट व्हिजिट ठेवत आहोत. आपल्यासाठी कोणती वेळ योग्य राहील?',
      English: 'Hi {name}, we are scheduling property site visits for this weekend. Would Saturday or Sunday morning work best for you?',
    },
  },
  {
    id: 'details',
    label: 'Plot Details',
    icon: Building2,
    templates: {
      Hindi: 'नागपुर प्राइम लोकेशन्स (बेसा, मिहान, काटोल रोड, वर्धा रोड) पर रेडी-टू-रजिस्ट्री, RL & NMRDA अप्रूव्ड प्लॉट्स 1000 से 2500 sq.ft में उपलब्ध हैं। तुरंत कब्जा व बैंक लोन सुविधा।',
      Marathi: 'नागपूर प्राईम लोकेशन (बेसा, मिहान, काटोल रोड, वर्धा रोड) वर रेडी-टू-रजिस्ट्री, RL व NMRDA मंजूर प्लॉट्स 1000 ते 2500 sq.ft उपलब्ध आहेत.',
      English: 'Verified RL & NMRDA approved residential plots (1000 - 2500 sq.ft) available in prime Nagpur growth corridors with immediate registry and bank loan sanction.',
    },
  },
  {
    id: 'token',
    label: 'Token / Deal',
    icon: ReceiptIndianRupee,
    templates: {
      Hindi: 'बधाई हो {name} जी! प्लॉट फाइनल करने हेतु टोकन पावती व बुकिंग एग्रीमेंट ड्राफ्ट तैयार है। कृपया अपने आधार व पैन कार्ड की कॉपी शेयर करें।',
      Marathi: 'अभिनंदन {name} जी! प्लॉट फायनल करण्यासाठी टोकन पावती आणि बुकिंग ॲग्रीमेंट तयार आहे. कृपया आधार आणि पॅन कार्ड पाठवावे.',
      English: 'Congratulations {name}! The token booking confirmation slip and draft agreement are ready. Please share a copy of your Aadhaar & PAN card to proceed.',
    },
  },
  {
    id: 'office',
    label: 'Office Location',
    icon: MapPin,
    templates: {
      Hindi: 'सरस्वती नगरी मुख्य कार्यालय: प्लॉट नं 12, ऑपोजिट मानकापूर स्टेडियम, काटोल रोड, नागपुर। कार्यालय समय: सुबह 10:00 से शाम 7:00 बजे तक। स्वागत है!',
      Marathi: 'सरस्वती नगरी मुख्य कार्यालय: प्लॉट नं 12, मानकापूर स्टेडियम समोर, काटोल रोड, नागपूर. वेळ: सकाळी 10 ते संध्याकाळी 7. आपले स्वागत आहे!',
      English: 'Saraswati Nagri Corporate Office: Plot No. 12, Opp. Mankapur Stadium, Katol Road, Nagpur. Office hours: 10:00 AM - 7:00 PM. We look forward to meeting you.',
    },
  },
];

export const LeadWhatsAppWindow: React.FC<LeadWhatsAppWindowProps> = ({
  leadName,
  leadId,
  phone,
  stage = 'New Inquiry',
  projectName = 'Nagpur Properties · Resale Desk',
  preferredLanguage = 'Hindi',
  onClose,
  onConnect,
  variant = 'overlay',
  onConvertToProperty,
  properties = [],
  lead,
  initialDraft,
}) => {
  const [messages, setMessages] = useState<WhatsAppMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatMessage, setChatMessage] = useState(initialDraft || '');
  const [language, setLanguage] = useState<WaLanguage>(preferredLanguage);
  const [activeSession, setActiveSession] = useState<WhatsAppSession | null>(null);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [isPropertyPickerOpen, setIsPropertyPickerOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialDraft) setChatMessage(initialDraft);
  }, [initialDraft, leadId]);

  // Generate and insert pitch for chosen property
  const handleSelectPropertyPitch = async (prop: ResaleProperty, autoSend = false) => {
    const code = prop.propertyCode || `NP-${prop.id.slice(0, 4).toUpperCase()}`;
    const approval = prop.legalStatus?.nmrdaApproved ? 'NMRDA मंजूर' : 'क्लिअर 7/12 टायटल';
    const approvalEn = prop.legalStatus?.nmrdaApproved ? 'NMRDA Approved, Clear Title' : 'Clear Title Verified';
    const approvalHi = prop.legalStatus?.nmrdaApproved ? 'NMRDA Sanctioned & Clear Title' : 'क्लियर 7/12 टाइटल';

    const pitch =
      language === 'Marathi'
        ? `नमस्कार ${leadName || 'जी'}! 🙏\n\nआपल्यासाठी निवडक रिसेल प्रॉपर्टी:\n\n🏡 *${prop.title}*\n🔖 कोड: ${code}\n📍 पत्ता: ${prop.locality}, ${prop.corridor || 'नागपूर'}\n💰 किंमत: *${prop.price}*\n📏 क्षेत्रफळ: ${prop.areaSqFt} sq.ft (${prop.bhk || 'Plot'})\n🧭 दिशा: ${prop.facing || 'East'}\n✅ ${approval}\n🏦 बँक लोन 80-90% उपलब्ध (SBI/HDFC)\n\nआपण ही प्रॉपर्टी प्रत्यक्ष पाहण्यासाठी (Site Visit) केव्हा येऊ शकता?\n\n- सरस्वती नगरी & नागपूर प्रॉपर्टीज रिसेल डेस्क\n📞 +91 89560 40220`
        : language === 'English'
        ? `Hello ${leadName || 'Sir/Madam'},\n\nCheck out this verified property in Nagpur:\n\n🏡 *${prop.title}*\n🔖 Code: ${code}\n📍 Location: ${prop.locality}, ${prop.corridor || 'Nagpur'}\n💰 Price: *${prop.price}*\n📏 Area: ${prop.areaSqFt} sq.ft (${prop.bhk || 'Plot'})\n🧭 Facing: ${prop.facing || 'East'}\n✅ ${approvalEn}\n🏦 80-90% Bank Loan Pre-Sanctioned (SBI/HDFC)\n\nWould you like to schedule a site visit this weekend?\n\n- Saraswati Nagri & Resale Desk\n📞 +91 89560 40220`
        : `नमस्ते ${leadName || 'जी'}! 🙏\n\nआपके लिए एक सत्यापित प्रॉपर्टी का विवरण:\n\n🏡 *${prop.title}*\n🔖 प्रॉपर्टी कोड: ${code}\n📍 लोकेशन: ${prop.locality}, ${prop.corridor || 'नागपुर'}\n💰 कीमत: *${prop.price}*\n📏 साइज: ${prop.areaSqFt} sq.ft (${prop.bhk || 'Plot'})\n🧭 फेसिंग: ${prop.facing || 'East'}\n✅ ${approvalHi}\n🏦 80%-90% बैंक लोन सुविधा (SBI / HDFC)\n\nक्या आप इस प्रॉपर्टी की साइट विजिट प्लान करना चाहेंगे?\n\n- सरस्वती नगरी & नागपुर प्रॉपर्टीज रिसेल डेस्क\n📞 हेल्पलाइन: +91 89560 40220`;

    setChatMessage(pitch);
    setIsPropertyPickerOpen(false);

    if (autoSend) {
      await handleSendDirectText(pitch);
    } else {
      toast.success(`Property "${prop.title}" loaded! Tap Send to share.`);
    }
  };

  // Convert chat text or specific message to structured resale property
  const handleConvertChatToProperty = (specificText?: string) => {
    if (!onConvertToProperty) return;

    const textToParse = specificText || messages.map((m) => m.text).filter(Boolean).join('\n');
    const parsed = parseWhatsAppPropertyMessage(textToParse || `${projectName} requirement`);
    const fields = parsed.extractedFields;

    const prefill: Partial<ResaleProperty> = {
      title: fields.title || `${fields.bhk || '2/3 BHK'} in ${fields.locality || 'Besa'} (${leadName})`,
      category: fields.category || 'flat',
      transactionType: fields.transactionType || 'resale',
      locality: fields.locality || 'Besa',
      corridor: fields.corridor || 'South Nagpur',
      address: fields.address || `${fields.locality || 'Besa'}, Nagpur, Maharashtra`,
      priceNumeric: fields.priceNumeric || 5000000,
      areaSqFt: fields.areaSqFt || 1200,
      carpetAreaSqFt: fields.areaSqFt ? Math.round(fields.areaSqFt * 0.76) : 900,
      bhk: fields.bhk || '3 BHK',
      facing: fields.facing || 'East',
      furnishing: fields.furnishing || 'Semi-Furnished',
      description: `Converted from WhatsApp Conversation with ${leadName} (${phone}):\n${textToParse}`,
      owner: {
        name: fields.ownerName || leadName,
        phone: fields.ownerPhone || phone,
        whatsapp: phone,
        negotiable: true,
        commissionPercent: 2,
        notes: `Added from WhatsApp chat with ${leadName}`
      },
      legalStatus: {
        nmrdaApproved: fields.legalStatus?.nmrdaApproved ?? true,
        rlAvailable: fields.legalStatus?.rlAvailable ?? true,
        reraRegistered: fields.legalStatus?.reraRegistered ?? true,
        nitApproved: false,
        clearTitle: fields.legalStatus?.clearTitle ?? true,
        loanEligible: true,
        eligibleBanks: ['State Bank of India', 'HDFC Bank']
      }
    };

    onConvertToProperty(prefill);
  };

  // Load WhatsApp session and chat history
  const loadChat = async () => {
    setLoading(true);
    try {
      const [{ sessions, activeSession: primarySession }, msgRes] = await Promise.all([
        fetchWhatsAppSessions(),
        fetchLeadWhatsAppMessages(leadId, phone),
      ]);

      setActiveSession(primarySession);
      setSessionsCount(sessions.length);
      setMessages(msgRes.messages || []);
    } catch (err) {
      console.error('Failed to load WhatsApp data:', err);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  useEffect(() => {
    loadChat();
  }, [leadId, phone]);

  // Real-time synchronization: Listen for new WhatsApp messages from Evolution API / Supabase
  useEffect(() => {
    if (!leadId || !supabaseDb) return;

    const channel = supabaseDb
      .channel(`rt-wa-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id || (row.wa_message_id && m.id === row.wa_message_id))) return prev;
            return [
              ...prev,
              {
                id: row.id,
                provider: row.provider || 'evolution',
                instanceName: row.instance_name || '',
                direction: (row.direction || 'outbound') as 'inbound' | 'outbound',
                fromNumber: row.from_number,
                toNumber: row.to_number,
                text: row.text || '',
                mediaUrl: row.media_url,
                mediaType: row.media_type,
                pushName: row.push_name,
                isGroup: false,
                messageTimestamp: row.message_timestamp || row.created_at,
                leadId: row.lead_id,
                createdAt: row.created_at,
              },
            ];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_interactions',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row?.type !== 'whatsapp') return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id || (row.wa_message_id && m.id === row.wa_message_id))) return prev;
            return [
              ...prev,
              {
                id: row.id,
                provider: 'saraswati_crm',
                instanceName: 'agent_dbc71212-d38b-40cc-8df2-4a99828ff449',
                direction: (row.direction || 'outbound') as 'inbound' | 'outbound',
                fromNumber: row.wa_from || null,
                toNumber: phone,
                text: row.content || '',
                mediaUrl: row.media_url,
                mediaType: row.media_type,
                pushName: null,
                isGroup: false,
                messageTimestamp: row.created_at,
                leadId: row.lead_id,
                createdAt: row.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      if (supabaseDb) supabaseDb.removeChannel(channel);
    };
  }, [leadId, phone]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isConnected = Boolean(activeSession && activeSession.status === 'connected');

  /**
   * Gemini AI Draft Generator
   * Intelligently crafts response personalized with lead name, budget, locality, and last chat.
   */
  const handleGenerateGeminiDraft = async (customPromptText?: string) => {
    setIsDraftingAi(true);
    try {
      const lastClientMsg = customPromptText || [...messages].reverse().find((m) => m.direction === 'inbound')?.text || '';

      const effectiveMessage =
        lastClientMsg ||
        `Inquiry regarding ${lead?.intent || projectName} in ${lead?.preferredLocalities?.[0] || 'Nagpur'}`;

      const res = await generateGeminiRealEstateReply({
        message: effectiveMessage,
        senderName: leadName,
        senderPhone: phone,
        leadStage: stage,
        projectName,
        locality: lead?.preferredLocalities?.join(', ') || 'Nagpur',
        budget: lead?.budgetDisplay,
        propertyCategory: lead?.propertyCategory,
        intent: lead?.intent,
        notes: lead?.notes,
        actionType: 'reply',
        recentHistory: messages.slice(-5).map((m) => ({
          sender: m.direction === 'inbound' ? 'lead' : 'agent',
          text: m.text,
        })),
      });

      if (res?.replyText) {
        setChatMessage(res.replyText);
        toast.success(res.source === 'gemini_api' ? '✨ Gemini AI draft ready!' : 'AI draft generated!');
      }
    } catch (err: any) {
      toast.error('AI draft error: ' + (err.message || 'Failed'));
    } finally {
      setIsDraftingAi(false);
    }
  };

  const handleSendDirectText = async (textToSend: string) => {
    if (!textToSend || sending) return;

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: WhatsAppMessageItem = {
      id: tempId,
      provider: 'evolution',
      instanceName: activeSession?.instanceName || '',
      direction: 'outbound',
      fromNumber: activeSession?.phoneNumber || '918956040220',
      toNumber: phone,
      text: textToSend,
      isGroup: false,
      messageTimestamp: new Date().toISOString(),
      leadId,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setChatMessage('');

    try {
      const res = await sendLeadWhatsAppMessage({
        leadId,
        phone,
        leadName,
        text: textToSend,
        instanceName: activeSession?.instanceName,
      });

      const phoneDigits = phone.replace(/\D/g, '');
      const phone10 = phoneDigits.slice(-10);

      if (res.realSent) {
        toast.success(`Delivered to ${leadName} (+91 ${phone10}) and archived in CRM.`);
      } else {
        // Seamless WhatsApp dispatch so the client always gets the message
        window.open(res.waLink, '_blank');
        toast.success(`Message opened in WhatsApp for ${leadName} & archived in CRM!`);
      }
    } catch (err: any) {
      const digits = phone.replace(/\D/g, '').slice(-10);
      const waFallback = `https://wa.me/91${digits}?text=${encodeURIComponent(textToSend)}`;
      window.open(waFallback, '_blank');
      toast.success(`Opened in WhatsApp for ${leadName}`);
    } finally {
      setSending(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleSend = async () => {
    const textToSend = chatMessage.trim();
    if (!textToSend) return;
    await handleSendDirectText(textToSend);
  };

  const handleQuickChipSelect = (chip: QuickChip) => {
    const template = chip.templates[language] || chip.templates.Hindi;
    const personalized = template.replace('{name}', leadName || 'Sir/Madam');
    setChatMessage(personalized);
  };

  const filteredProperties = properties
    .filter(
      (p) =>
        !propertySearch.trim() ||
        p.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
        p.locality.toLowerCase().includes(propertySearch.toLowerCase()) ||
        (p.bhk || '').toLowerCase().includes(propertySearch.toLowerCase()) ||
        (p.corridor || '').toLowerCase().includes(propertySearch.toLowerCase())
    )
    .slice(0, 8);

  const shellClasses =
    variant === 'overlay'
      ? 'fixed top-0 right-0 z-[60] h-dvh w-full md:max-w-md shadow-2xl flex flex-col bg-[#efeae2] overflow-hidden border-l border-slate-300'
      : 'flex flex-col bg-[#efeae2] h-full w-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm';

  return (
    <div className={shellClasses} role="dialog" aria-label={`WhatsApp chat with ${leadName}`}>
      {/* 1. Header (Exact Saraswati Nagri #075e54 emerald styling matching image) */}
      <header className="bg-[#075e54] px-3.5 py-3 flex items-center gap-3 shrink-0 shadow-md text-white">
        <button
          type="button"
          onClick={onClose}
          className="text-white/90 hover:text-white p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center font-black text-sm shrink-0 border border-white/30 shadow-inner">
          {leadName ? leadName.charAt(0).toUpperCase() : 'L'}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-sm truncate leading-tight">{leadName}</p>
          <p className="text-white/80 text-[11px] truncate flex items-center gap-1.5 mt-0.5 font-mono">
            <span>{phone}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={loadChat}
            title="Refresh chat history"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <MessageCircle className="h-5 w-5 text-emerald-300" />
        </div>
      </header>

      {/* 2. Subheader: Project Context + Language Selector */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2 shadow-xs">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 shrink-0 text-teal-600" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black text-slate-800 leading-tight">
              {projectName}
            </p>
            <p className="truncate text-[9px] font-semibold text-slate-400">
              {stage} {lead?.budgetDisplay ? `· ${lead.budgetDisplay}` : ''}
            </p>
          </div>
        </div>

        {/* Language selector & Convert to property button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onConvertToProperty && (
            <button
              type="button"
              onClick={() => handleConvertChatToProperty()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shadow-xs transition-colors cursor-pointer shrink-0"
              title="Parse this WhatsApp conversation and register as Resale Property"
            >
              <Building2 className="w-3 h-3" />
              <span>+ Resale Property</span>
            </button>
          )}

          <label className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1">
            <Languages className="h-3 w-3 text-green-700" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as WaLanguage)}
              className="bg-transparent text-[11px] font-black text-green-800 outline-none cursor-pointer"
              aria-label="Buyer message language"
            >
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
              <option value="English">English</option>
            </select>
          </label>
        </div>
      </div>

      {/* Chat Thread Stream */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1.5 flex flex-col min-h-0 bg-[#efeae2] custom-scrollbar">
        {/* Discussion Banner */}
        <div className="mx-auto mb-2 max-w-[94%] rounded-lg bg-[#fff5c4] border border-[#f5e6a8] px-3 py-1.5 text-center text-[11px] font-semibold text-slate-700 shadow-xs">
          Discussing <span className="font-black text-slate-900">{leadName}</span> ·{' '}
          {lead?.preferredLocalities?.join(', ') || projectName}
        </div>

        {loading ? (
          <div className="m-auto text-xs text-slate-500 font-medium flex items-center gap-2 py-8">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> Loading WhatsApp history from Supabase…
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto text-center px-6 max-w-xs py-10">
            <div className="w-12 h-12 bg-white/70 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs text-slate-700 font-bold">No WhatsApp messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Tap a quick template below or type a message. All chats are archived in Supabase!
            </p>
          </div>
        ) : (
          messages.map((m, index) => {
            const inbound = m.direction === 'inbound';
            const previous = index > 0 ? messages[index - 1] : null;
            const showDay = !previous || dayKey(previous.messageTimestamp) !== dayKey(m.messageTimestamp);

            return (
              <React.Fragment key={m.id || index}>
                {showDay && (
                  <div className="mx-auto my-1.5 rounded-md bg-white/90 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 shadow-xs border border-black/5">
                    {dayLabel(m.messageTimestamp)}
                  </div>
                )}

                <div
                  className={`max-w-[85%] px-3 py-1.5 text-[13px] font-medium shadow-xs whitespace-pre-wrap break-words leading-relaxed ${
                    inbound
                      ? 'self-start bg-white text-slate-800 rounded-r-xl rounded-tl-xl rounded-bl-xs border border-black/5'
                      : 'self-end bg-[#d9fdd3] text-slate-800 rounded-l-xl rounded-tr-xl rounded-br-xs border border-green-200/50'
                  }`}
                >
                  {/* Media attachment link if present */}
                  {m.mediaUrl && (
                    <a
                      href={m.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-1.5 flex items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-white"
                    >
                      <FileText className="h-4 w-4 text-rose-600" />
                      <span>{m.mediaType === 'image' ? 'View Photo' : 'Open Attachment'}</span>
                      <ExternalLink className="h-3 w-3 ml-auto text-slate-400" />
                    </a>
                  )}

                  <p className="text-slate-800">{m.text}</p>

                  {/* Actions for Inbound Messages: Inline AI Auto-Reply & Add as Property */}
                  {inbound && (
                    <div className="mt-1.5 pt-1 border-t border-black/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateGeminiDraft(m.text)}
                        disabled={isDraftingAi}
                        className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Draft an AI reply directly to this client message"
                      >
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>✨ AI Reply</span>
                      </button>

                      {onConvertToProperty && m.text && m.text.length > 20 && (
                        <button
                          type="button"
                          onClick={() => handleConvertChatToProperty(m.text)}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Parse this message text as property listing"
                        >
                          <PlusSquare className="w-3 h-3" />
                          <span>+ Property</span>
                        </button>
                      )}
                    </div>
                  )}

                  <span
                    className={`block text-[9px] text-right mt-1 font-semibold ${
                      inbound ? 'text-slate-400' : 'text-green-800/60'
                    }`}
                  >
                    {formatTime(m.messageTimestamp)}
                    {!inbound && (
                      <CheckCheck
                        className="ml-1 inline h-3.5 w-3.5 text-sky-500"
                        aria-label="Delivered"
                      />
                    )}
                  </span>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* 5. Chips Bar: Exact Order from User Screenshot (Gemini AI Draft, Share Property Details, Quick Chips) */}
      <div className="bg-[#f0f2f5] border-t border-black/5 px-2.5 py-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {/* 1. Gemini AI Draft */}
          <button
            type="button"
            onClick={() => handleGenerateGeminiDraft()}
            disabled={isDraftingAi}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[11px] font-bold shrink-0 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Generate AI reply draft using Google Gemini"
          >
            {isDraftingAi ? (
              <Loader2 className="w-3 h-3 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3 h-3 text-purple-200" />
            )}
            <span>{isDraftingAi ? 'Drafting…' : '✨ Gemini AI Draft'}</span>
          </button>

          {/* 2. Share Property Details (Amber Pill matching image) */}
          <button
            type="button"
            onClick={() => setIsPropertyPickerOpen(!isPropertyPickerOpen)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-bold shrink-0 transition-all cursor-pointer shadow-2xs ${
              isPropertyPickerOpen
                ? 'bg-amber-600 ring-2 ring-amber-400'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
            title="Select a property from CRM inventory to pitch over WhatsApp"
          >
            <Building2 className="w-3 h-3" />
            <span>🏡 Share Property Details</span>
          </button>

          {/* 3. Standard Quick Reply Chips */}
          {QUICK_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleQuickChipSelect(chip)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-green-50 border border-slate-200 hover:border-green-300 text-slate-700 hover:text-green-800 text-[11px] font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
              >
                <Icon className="w-3 h-3 text-green-600" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Property Picker Dropdown (Exact design matching user screenshot) */}
        {isPropertyPickerOpen && (
          <div className="mt-1 mb-1 p-2.5 bg-white border border-amber-200 rounded-xl shadow-md max-h-56 overflow-y-auto space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[11px] font-black text-slate-800">Choose Resale Property to Pitch:</span>
              <button
                type="button"
                onClick={() => setIsPropertyPickerOpen(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by title, Besa, Manish Nagar, BHK..."
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
              autoFocus
            />
            <div className="space-y-1 pt-0.5">
              {filteredProperties.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3">No matching properties found</p>
              ) : (
                filteredProperties.map((prop) => (
                  <div
                    key={prop.id}
                    className="w-full p-2 rounded-lg bg-slate-50/70 hover:bg-amber-50/80 border border-slate-100 hover:border-amber-200 transition-colors flex items-center justify-between gap-2 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPropertyPitch(prop, false)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                      title="Load property pitch into message box"
                    >
                      <p className="font-bold text-xs text-slate-900 truncate group-hover:text-amber-900">{prop.title}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {prop.locality} · {prop.bhk || prop.category} · {prop.areaSqFt} sqft
                      </p>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-emerald-700">{prop.price}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectPropertyPitch(prop, true)}
                        className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                        title="Send property details directly to lead over WhatsApp"
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. Composer & Send Controls */}
        <div className="mt-1 flex gap-2 items-end">
          <div className="min-w-0 flex-1">
            <textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={Math.min(4, Math.max(1, chatMessage.split('\n').length))}
              placeholder="Type message… (Enter to send)"
              className="min-h-[42px] max-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !chatMessage.trim()}
            className="w-10 h-10 bg-[#00a884] text-white rounded-full flex items-center justify-center hover:bg-[#008f72] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors cursor-pointer mb-0.5"
            title="Send inside the CRM through the paired WhatsApp line"
            aria-label="Send WhatsApp message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>

          {/* 1-Click Fallback to WhatsApp Web / Native Mobile WhatsApp */}
          <a
            href={`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(chatMessage || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0 mb-0.5"
            title="Open in WhatsApp Web / App directly with this message prefilled"
            aria-label="Open in WhatsApp"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LeadWhatsAppWindow;

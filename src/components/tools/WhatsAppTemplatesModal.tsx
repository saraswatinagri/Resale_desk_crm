import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Send, 
  CheckCircle2, 
  FileText,
  Sparkles,
  Phone
} from 'lucide-react';
import { generateWhatsAppLink } from '../../utils/formatters';
import { useAuth } from '../../lib/auth-context';

interface WhatsAppTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultClientName?: string;
}

interface TemplateItem {
  id: string;
  title: string;
  category: 'inquiry' | 'visit' | 'negotiation' | 'token' | 'seller';
  template: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 't-1',
    title: 'New Lead Welcome & Introduction (Nagpur Resale Desk)',
    category: 'inquiry',
    template: `Namaste {ClientName} ji,\n\nThank you for reaching out to *Nagpur Properties & Saraswati Nagri Resale Desk*.\n\nWe noted your requirement for a *{Requirement}* in Nagpur (Preferred: *{Locality}*, Budget: *{Budget}*).\n\nWe have verified, clear-title properties currently available with NMRDA sanction and loan pre-approvals.\n\nWhen would be a convenient time for a brief 2-minute phone call to understand your specific preferences (floor, facing, possession)?\n\n- {AgentName}\nResale Desk Head | Nagpur Properties & Saraswati Nagri\n📱 {AgentPhone}`
  },
  {
    id: 't-2',
    title: 'Site Visit Confirmation with Address & Google Maps',
    category: 'visit',
    template: `Namaste {ClientName} ji,\n\nYour property site visit is confirmed!\n\n📍 *Property:* {PropertyTitle}\n🗺️ *Location:* {Address}, {Locality}\n📅 *Date:* {Date}\n⏰ *Time:* {Time}\n👤 *Field Incharge:* {AgentName} (📱 {AgentPhone})\n\nOur executive will meet you at the location. Please feel free to call if you need directions or want to adjust the timing.\n\nLooking forward to showing you the property!\n\n- Nagpur Properties & Saraswati Nagri Team`
  },
  {
    id: 't-3',
    title: 'Post-Visit Feedback & Next Steps',
    category: 'visit',
    template: `Hello {ClientName} ji,\n\nThank you for taking out the time to visit *{PropertyTitle}* today.\n\nHow did your family like the layout, ventilation, and locality? If you have any questions regarding the title documents, NMRDA sanction, or pricing negotiation with the owner, please feel free to discuss with us.\n\nWe are here to help you get the best deal.\n\nWarm regards,\n{AgentName} | Resale Desk`
  },
  {
    id: 't-4',
    title: 'Price Negotiation & Counter-Offer Update',
    category: 'negotiation',
    template: `Namaste {ClientName} ji,\n\nRegarding *{PropertyTitle}* in {Locality}:\n\nWe had a detailed discussion with the owner regarding your offer. The owner is open to a reasonable closure around *{TargetPrice}* subject to a token booking within 48 hours.\n\nShall we arrange a quick face-to-face sit-down meeting today at our office to finalize the paperwork?\n\n- Nagpur Properties Resale Desk`
  },
  {
    id: 't-5',
    title: 'Token Paid Receipt & Bank Loan Document Checklist',
    category: 'token',
    template: `Heartiest Congratulations {ClientName} ji! 🎉\n\nWe are delighted to confirm that the token booking for *{PropertyTitle}* has been received.\n\nTo initiate the fast-track Home Loan sanction with SBI / HDFC, please keep the following KYC documents ready:\n1. PAN Card & Aadhaar Card\n2. Last 3 months Salary Slips\n3. Last 6 months Bank Statement\n4. Form 16 (Last 2 Years)\n\nOur post-sales legal desk is preparing the Draft Agreement & 30-year search report.\n\n- Nagpur Properties & Saraswati Nagri Team`
  },
  {
    id: 't-6',
    title: 'Owner Property Valuation & Resale Desk Listing',
    category: 'seller',
    template: `Namaste {OwnerName} ji,\n\nThank you for trusting *Nagpur Properties & Saraswati Nagri* to market your property for resale.\n\nOur resale desk specializes in verified buyers actively looking in *{Locality}*.\n\nOur field manager would like to visit your property for a 15-minute photographic audit and market valuation report. Please let us know your preferred day and time for key access.\n\n- Nagpur Properties Resale Desk`
  }
];

export const WhatsAppTemplatesModal: React.FC<WhatsAppTemplatesModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultClientName = ''
}) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].id);
  const [recipientPhone, setRecipientPhone] = useState<string>(defaultPhone);
  const [clientName, setClientName] = useState<string>(defaultClientName || 'Sir/Madam');
  const [propertyTitle, setPropertyTitle] = useState<string>('3 BHK Garden Flat in Besa');
  const [locality, setLocality] = useState<string>('Besa');
  const [copied, setCopied] = useState<boolean>(false);

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

  const agentName = user?.fullName || 'Sagar Madhukar kamble';
  const agentPhone = user?.phone || '8275437826';

  // Replace placeholders
  const processedMessage = currentTemplate.template
    .replace(/{ClientName}/g, clientName || 'Sir/Madam')
    .replace(/{OwnerName}/g, clientName || 'Sir/Madam')
    .replace(/{PropertyTitle}/g, propertyTitle)
    .replace(/{Locality}/g, locality)
    .replace(/{Requirement}/g, '3 BHK Flat')
    .replace(/{Budget}/g, '₹55L - ₹65L')
    .replace(/{Address}/g, 'Near Pipla Fata')
    .replace(/{Date}/g, 'Tomorrow (Sunday)')
    .replace(/{Time}/g, '11:30 AM')
    .replace(/{AgentName}/g, agentName)
    .replace(/{AgentPhone}/g, agentPhone)
    .replace(/{TargetPrice}/g, '₹59 Lakhs');

  const handleCopy = () => {
    navigator.clipboard.writeText(processedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!recipientPhone.trim()) {
      alert('Please enter a recipient phone number');
      return;
    }
    const link = generateWhatsAppLink(recipientPhone, processedMessage);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center border border-green-200">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Nagpur Properties WhatsApp Message Library</h2>
              <p className="text-[11px] text-slate-500">Pre-approved compliance & engagement messages</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Message Scenario:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    selectedTemplateId === t.id
                      ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block mb-0.5">
                    {t.category}
                  </span>
                  <span className="line-clamp-1">{t.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Fillers */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Customize Fields
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Ramesh Deshmukh"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Locality</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Manish Nagar"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Property Title</label>
                <input
                  type="text"
                  value={propertyTitle}
                  onChange={(e) => setPropertyTitle(e.target.value)}
                  placeholder="e.g. 2 BHK Somalwada"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Rendered Preview Box */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Live Preview
            </span>
            <div className="p-4 rounded-xl bg-white font-mono text-[11px] text-slate-800 border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-sm">
              {processedMessage}
            </div>
          </div>

          {/* Recipient Phone and Send */}
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-teal-900 mb-1">
                Recipient WhatsApp Number (with 91)
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. 8275437826"
                className="w-full sm:max-w-xs px-3 py-2 rounded-lg bg-white border border-teal-300 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleSendWhatsApp}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send WhatsApp</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400">Saraswati Nagri • Resale Desk CRM</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

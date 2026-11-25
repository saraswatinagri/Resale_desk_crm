import React, { useState } from 'react';
import {
  Building2,
  Tag,
  Plus,
  Calculator,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  LogOut,
  UserCheck
} from 'lucide-react';
import type { CrmUserProfile } from '../../types/crm';
import type { CrmTab } from './Sidebar';

interface NavbarProps {
  currentTab: CrmTab;
  onOpenAddLead: () => void;
  onOpenAddProperty: () => void;
  onOpenCalculator: () => void;
  onOpenTemplates: () => void;
  onOpenWhatsAppConnect?: () => void;
  onRefreshSync: () => void;
  isSyncing: boolean;
  isLiveSupabase: boolean;
  activeDesk: 'resale' | 'sales';
  onToggleDesk: () => void;
  currentUser: CrmUserProfile;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenAddLead,
  onOpenAddProperty,
  onOpenCalculator,
  onOpenTemplates,
  onOpenWhatsAppConnect,
  onRefreshSync,
  isSyncing,
  isLiveSupabase,
  activeDesk,
  onToggleDesk,
  currentUser,
  onSignOut,
}) => {
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);

  const headerIconBg =
    currentTab === 'properties'
      ? 'from-amber-500 to-orange-500 shadow-amber-500/20'
      : currentTab === 'leads'
        ? 'from-purple-500 to-indigo-500 shadow-purple-500/20'
        : 'from-teal-500 to-emerald-600 shadow-teal-500/20';

  const HeaderIcon = currentTab === 'properties' ? Building2 : PhoneCall;

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-2 sm:px-4 md:px-8 py-2 md:py-3.5 flex items-center justify-between z-30 shadow-xs gap-1.5 sm:gap-3 w-full max-w-full overflow-hidden">
      {/* Left: Title Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <div
          className={`hidden md:flex w-9 h-9 bg-gradient-to-br ${headerIconBg} rounded-xl shadow-lg items-center justify-center shrink-0`}
        >
          <HeaderIcon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-none truncate max-w-[110px] xs:max-w-[170px] sm:max-w-none">
            {currentTab === 'leads' && (activeDesk === 'resale' ? 'Resale Leads' : 'Plot Sales')}
            {currentTab === 'properties' && 'Properties & Inventory'}
            {currentTab === 'dashboard' && 'Dashboard Overview'}
            {currentTab === 'matcher' && 'Smart Match Engine'}
            {currentTab === 'visits' && 'Site Visits'}
          </h1>
          <p className="hidden md:block text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">
            {activeDesk === 'resale'
              ? 'Nagpur Properties · Linked with Saraswati Nagri CRM'
              : 'Saraswati Nagri Plot Sales Pipeline'}
          </p>
        </div>
      </div>

      {/* Right: Exact Saraswati Nagri Action Pills (Fully Adaptive for Mobile) */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 max-w-[calc(100vw-110px)] sm:max-w-none overflow-x-auto scrollbar-hide py-0.5">
        <button
          type="button"
          onClick={onRefreshSync}
          disabled={isSyncing}
          title="Refresh latest leads & properties"
          className="p-1.5 sm:p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
        </button>

        {/* ADD LEAD */}
        <button
          type="button"
          onClick={onOpenAddLead}
          className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full min-h-[30px] sm:min-h-[36px] px-2 sm:px-4 py-1 sm:py-1.5 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Add Lead</span>
          <span className="xs:hidden">Lead</span>
        </button>

        {/* REGISTER PROPERTY */}
        <button
          type="button"
          onClick={onOpenAddProperty}
          className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full min-h-[30px] sm:min-h-[36px] px-2 sm:px-4 py-1 sm:py-1.5 font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Register Property</span>
          <span className="hidden xs:inline sm:hidden">Property</span>
          <span className="xs:hidden">Prop</span>
        </button>

        {/* DESK SWITCHER PILL */}
        <button
          type="button"
          onClick={onToggleDesk}
          className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full min-h-[30px] sm:min-h-[36px] px-2 sm:px-3.5 py-1 sm:py-1.5 font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 ${activeDesk === 'resale'
              ? 'bg-teal-600 hover:bg-teal-700 text-white border border-teal-600'
              : 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-600'
            }`}
          title={activeDesk === 'resale' ? 'Switch to Saraswati Nagri Plot Sales' : 'Open Nagpur Properties Resale Desk'}
        >
          {activeDesk === 'resale' ? (
            <>
              <Tag className="w-3.5 h-3.5" />
              <span>Resale</span>
            </>
          ) : (
            <>
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Plot Sales</span>
              <span className="xs:hidden">Plots</span>
            </>
          )}
        </button>

        {/* WHATSAPP & GEMINI AI GATEWAY PILL */}
        {onOpenWhatsAppConnect && (
          <button
            type="button"
            onClick={onOpenWhatsAppConnect}
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full min-h-[30px] sm:min-h-[36px] px-2.5 sm:px-4 py-1 sm:py-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer shrink-0"
            title="Open WhatsApp Gateway & Google Gemini AI Auto-Reply Console"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <MessageSquare className="w-3.5 h-3.5 text-white" />
            <span className="hidden xs:inline">WhatsApp &amp; AI</span>
            <span className="xs:hidden">WA AI</span>
          </button>
        )}

        {/* Mobile Profile Trigger (Visible on small screens) */}
        <div className="relative lg:hidden shrink-0">
          <button
            type="button"
            onClick={() => setShowMobileProfileMenu(!showMobileProfileMenu)}
            title={`${currentUser.fullName} (${currentUser.role})`}
            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shadow-xs border-2 border-white bg-gradient-to-tr ${currentUser.color} cursor-pointer`}
          >
            {currentUser.avatar}
          </button>

          {showMobileProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-800 truncate">{currentUser.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{currentUser.role}</p>
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileProfileMenu(false);
                    onOpenCalculator();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>EMI / Stamp Duty</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileProfileMenu(false);
                    onOpenTemplates();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                  <span>WhatsApp Templates</span>
                </button>
                {onOpenWhatsAppConnect && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileProfileMenu(false);
                      onOpenWhatsAppConnect();
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/70 rounded-lg flex items-center gap-2 cursor-pointer font-bold"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp &amp; Gemini AI</span>
                  </button>
                )}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer font-bold border-t border-slate-100 mt-1 pt-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Quick Icons & Avatar */}
        <div className="hidden lg:flex items-center gap-1.5 pl-1 border-l border-slate-200">
          <button
            type="button"
            onClick={onOpenCalculator}
            title="Nagpur Stamp Duty & EMI Calculator"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
          </button>
          <button
            type="button"
            onClick={onOpenTemplates}
            title="WhatsApp Client Templates"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-green-600" />
          </button>
          {onOpenWhatsAppConnect && (
            <button
              type="button"
              onClick={onOpenWhatsAppConnect}
              title="WhatsApp Gateway & Google Gemini AI Console"
              className="p-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer shadow-sm relative"
            >
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </button>
          )}
          <div
            title={`${currentUser.fullName} (${currentUser.role})`}
            className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm border-2 border-white bg-gradient-to-tr ${currentUser.color} shrink-0`}
          >
            {currentUser.avatar}
          </div>
        </div>
      </div>
    </header>
  );
};

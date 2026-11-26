import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Tag,
  Plus,
  Calculator,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  LogOut,
  UserCheck,
  Flame,
  ChevronDown,
  Shield,
  ExternalLink
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
  whatsAppLive?: boolean;
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
  whatsAppLive = false,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const headerIconBg =
    currentTab === 'properties'
      ? 'from-amber-500 to-orange-500 shadow-amber-500/20'
      : currentTab === 'leads'
        ? 'from-purple-500 to-indigo-500 shadow-purple-500/20'
        : 'from-teal-500 to-emerald-600 shadow-teal-500/20';

  const HeaderIcon = currentTab === 'properties' ? Building2 : PhoneCall;

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-2 sm:px-4 md:px-8 py-2 md:py-3.5 flex items-center justify-between z-30 shadow-xs gap-1.5 sm:gap-3 w-full max-w-full">
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

      {/* Right: Exact Saraswati Nagri Action Pills (Fully Adaptive for Mobile & Desktop) */}
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

        {/* OFFICE CALL / HOT LEAD BUTTON (EXACT SARASWATI NAGRI CRM) */}
        <button
          type="button"
          onClick={onOpenAddLead}
          title="Office Call / Direct Hotline - Instant Lead Allotment to Sagar Sir"
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 text-white font-black text-xs shadow-md shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <span className="text-xs leading-none animate-pulse">🔥</span>
          <span className="hidden sm:inline">Office Call</span>
          <span className="sm:hidden font-black">Call</span>
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

        {/* User Profile Avatar with Interactive Dropdown (Desktop & Mobile) */}
        <div className="relative shrink-0" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title={`${currentUser.fullName} (${currentUser.role})`}
            className={`h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full flex items-center justify-center text-white font-bold text-[11px] md:text-xs shadow-xs border-2 border-white bg-gradient-to-tr ${currentUser.color} cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
          >
            {currentUser.avatar}
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs bg-gradient-to-tr ${currentUser.color} shrink-0`}>
                    {currentUser.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800 truncate">{currentUser.fullName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-2.5 h-2.5 text-rose-500" />
                      <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">{currentUser.role}</span>
                    </div>
                  </div>
                </div>
                {currentUser.email && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{currentUser.email}</p>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenCalculator();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 cursor-pointer font-medium transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>EMI / Stamp Duty Calculator</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenTemplates();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 cursor-pointer font-medium transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                  <span>WhatsApp Pitch Templates</span>
                </button>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer font-bold border-t border-slate-100 mt-1 pt-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

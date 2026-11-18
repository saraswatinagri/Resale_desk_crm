import React from 'react';
import {
  Building2,
  Tag,
  Plus,
  Calculator,
  MessageSquare,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import type { CrmUserProfile } from '../../types/crm';
import type { CrmTab } from './Sidebar';

interface NavbarProps {
  currentTab: CrmTab;
  onOpenAddLead: () => void;
  onOpenAddProperty: () => void;
  onOpenCalculator: () => void;
  onOpenTemplates: () => void;
  onRefreshSync: () => void;
  isSyncing: boolean;
  isLiveSupabase: boolean;
  activeDesk: 'resale' | 'sales';
  onToggleDesk: () => void;
  currentUser: CrmUserProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenAddLead,
  onOpenAddProperty,
  onOpenCalculator,
  onOpenTemplates,
  onRefreshSync,
  isSyncing,
  isLiveSupabase,
  activeDesk,
  onToggleDesk,
  currentUser,
}) => {
  const headerIconBg =
    currentTab === 'properties'
      ? 'from-amber-500 to-orange-500 shadow-amber-500/20'
      : currentTab === 'leads'
        ? 'from-purple-500 to-indigo-500 shadow-purple-500/20'
        : 'from-teal-500 to-emerald-600 shadow-teal-500/20';

  const HeaderIcon = currentTab === 'properties' ? Building2 : PhoneCall;

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 md:px-8 py-2.5 md:py-4 flex items-center justify-between z-30 shadow-sm gap-2 md:gap-4">
      {/* Left: Exact Saraswati Nagri headerContent title cluster */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`hidden md:flex w-9 h-9 bg-gradient-to-br ${headerIconBg} rounded-xl shadow-lg items-center justify-center shrink-0`}
        >
          <HeaderIcon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-black text-slate-800 tracking-tight leading-none truncate">
            {currentTab === 'leads' && (activeDesk === 'resale' ? 'Resale Desk Directory' : 'Plot Sales Directory')}
            {currentTab === 'properties' && 'Resale Properties & Projects'}
            {currentTab === 'dashboard' && 'Executive Overview'}
            {currentTab === 'matcher' && 'Smart Match Engine'}
            {currentTab === 'visits' && 'Site Visits Scheduler'}
          </h1>
          <p className="hidden md:block text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">
            {activeDesk === 'resale'
              ? 'Nagpur Properties · Linked with Saraswati Nagri CRM'
              : 'Saraswati Nagri Plot Sales Pipeline'}
          </p>
        </div>
      </div>

      {/* Right: Exact Saraswati Nagri Action Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={onRefreshSync}
          disabled={isSyncing}
          title="Refresh latest leads & properties"
          className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
        </button>

        {/* ADD LEAD (Exact purple pill from admin-dashboard.tsx) */}
        <button
          type="button"
          onClick={onOpenAddLead}
          className="inline-flex items-center justify-center gap-1.5 rounded-full min-h-[36px] px-3.5 sm:px-4 py-1.5 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Lead</span>
        </button>

        {/* REGISTER PROPERTY (Exact slate-900 pill from projects/client.tsx) */}
        <button
          type="button"
          onClick={onOpenAddProperty}
          className="inline-flex items-center justify-center gap-1.5 rounded-full min-h-[36px] px-3.5 sm:px-4 py-1.5 font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Register Property</span>
          <span className="sm:hidden">Property</span>
        </button>

        {/* DESK SWITCHER PILL (Exact from admin-dashboard.tsx line 1554-1576) */}
        <button
          type="button"
          onClick={onToggleDesk}
          className={`inline-flex items-center justify-center gap-1.5 rounded-full min-h-[36px] px-3.5 py-1.5 font-bold text-xs transition-all shadow-sm cursor-pointer shrink-0 ${activeDesk === 'resale'
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
              <span>Plot Sales</span>
            </>
          )}
        </button>

        {/* Quick Icons & Avatar */}
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

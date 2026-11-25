import React from 'react';
import {
  Building2,
  PhoneCall,
  Sparkles,
  MapPin,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import type { CrmUserProfile } from '../../types/crm';

export type CrmTab = 'dashboard' | 'leads' | 'properties' | 'matcher' | 'visits';

interface SidebarProps {
  currentTab: CrmTab;
  onSelectTab: (tab: CrmTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCalculator?: () => void;
  onOpenTemplates?: () => void;
  onOpenBackup?: () => void;
  onOpenWhatsAppConnect?: () => void;
  onOpenWebsiteApi?: () => void;
  totalLeads: number;
  totalProperties: number;
  currentUser: CrmUserProfile;
  isLiveSupabase: boolean;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  onOpenCalculator,
  onOpenTemplates,
  onOpenBackup,
  onOpenWhatsAppConnect,
  onOpenWebsiteApi,
  totalLeads,
  totalProperties,
  currentUser,
  isLiveSupabase,
  onSignOut,
}) => {
  const navItems: Array<{ id: CrmTab; label: string; icon: React.ComponentType<{ className?: string }>; badge: string | number | null }> = [
    { id: 'leads', label: 'Leads', icon: PhoneCall, badge: totalLeads },
    { id: 'properties', label: 'Properties', icon: Building2, badge: totalProperties },
    { id: 'visits', label: 'Site Visits', icon: MapPin, badge: null },
    { id: 'matcher', label: 'Smart Match', icon: Sparkles, badge: 'AI' },
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, badge: null },
  ];

  return (
    <>
      {/* ── DESKTOP SIDEBAR (Exact Saraswati Nagri CRM dark navy rail) ── */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 text-white border-r border-slate-800 shrink-0 fixed top-0 bottom-0 left-0 z-40 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[72px] overflow-visible' : 'w-64 overflow-y-auto'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2 p-4 pb-2' : 'gap-3 p-6'}`}>
          <div
            onClick={() => onSelectTab('leads')}
            className={`relative shrink-0 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-rose-500/20 cursor-pointer ${
              collapsed ? 'h-9 w-9' : 'h-10 w-10'
            }`}
          >
            <Building2 className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectTab('leads')}>
              <h1 className="text-lg font-black tracking-tight leading-none text-white truncate">Saraswati Nagri</h1>
              <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase block mt-0.5">
                Master CRM · Resale
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ${
              !collapsed ? 'ml-auto' : ''
            }`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-2 mt-2 ${collapsed ? 'px-3' : 'px-4'}`}>
          {!collapsed && (
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-3">
              Main Menu
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full group relative flex items-center rounded-xl transition-all font-semibold cursor-pointer ${
                  collapsed ? 'justify-center p-3' : 'gap-3 py-3 px-4 text-left'
                } ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : `text-slate-500 ${collapsed ? 'group-hover:text-white' : ''}`
                  }`}
                />
                {!collapsed && (
                  <>
                    <span className="text-sm flex-1 truncate">{item.label}</span>
                    {item.badge !== null && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* WhatsApp & Gemini AI Gateway Quick Access */}
        {onOpenWhatsAppConnect && (
          <div className={`mt-auto ${collapsed ? 'px-2 pb-2' : 'px-4 pb-3'}`}>
            <button
              type="button"
              onClick={onOpenWhatsAppConnect}
              title="WhatsApp Gateway & Google Gemini AI Auto-Reply"
              className={`w-full flex items-center rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/60 border border-emerald-500/40 text-emerald-300 hover:from-emerald-900/90 hover:to-teal-900/70 hover:text-white transition-all cursor-pointer font-bold text-xs ${
                collapsed ? 'justify-center p-2.5' : 'gap-2.5 p-3'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              {!collapsed && (
                <div className="flex-1 text-left flex items-center justify-between min-w-0">
                  <span className="truncate">WhatsApp &amp; AI</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Gemini
                  </span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* User Profile (Desktop — exact Saraswati Nagri CRM) */}
        <div className={`border-t border-slate-800 ${collapsed ? 'p-3' : 'p-4'}`}>
          <div
            className={`w-full flex items-center transition-all ${
              collapsed
                ? 'justify-center py-1 flex-col gap-2'
                : 'bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50 gap-3'
            }`}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm bg-gradient-to-tr ${currentUser.color} shrink-0`}
            >
              {currentUser.avatar}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 truncate">
                  {currentUser.role}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onSignOut}
              title={isLiveSupabase ? 'Sign Out' : 'Switch to CRM Sign In'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAVIGATION (Exact Saraswati Nagri CRM mobile bar) ── */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 w-full max-w-full bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 sm:px-2 pt-1.5 pb-2 flex items-stretch z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] overflow-hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[46px] py-1 px-1 rounded-xl transition-all relative flex-1 min-w-0 cursor-pointer ${
                isActive ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-rose-500 rounded-b-full shadow-xs" />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] tracking-tight truncate max-w-full leading-tight font-semibold">{item.label}</span>
            </button>
          );
        })}
        {onOpenWhatsAppConnect && (
          <button
            type="button"
            onClick={onOpenWhatsAppConnect}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[46px] py-1 px-1 rounded-xl transition-all relative flex-1 min-w-0 cursor-pointer text-emerald-600 hover:text-emerald-700 font-bold"
          >
            <div className="relative">
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-full leading-tight font-bold text-emerald-700">WA &amp; AI</span>
          </button>
        )}
      </nav>
    </>
  );
};

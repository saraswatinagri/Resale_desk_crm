import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, type CrmTab } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { LeadsDesk } from './components/leads/LeadsDesk';
import { AddLeadModal } from './components/leads/AddLeadModal';
import { LeadDetailModal } from './components/leads/LeadDetailModal';
import { PropertiesDesk } from './components/properties/PropertiesDesk';
import { AddPropertyModal } from './components/properties/AddPropertyModal';
import { PropertyDetailModal } from './components/properties/PropertyDetailModal';
import { SmartMatcherModal } from './components/matching/SmartMatcherModal';
import { SiteVisitsDesk } from './components/visits/SiteVisitsModal';
import { DataToolsModal } from './components/common/DataToolsModal';
import { DealCalculatorModal } from './components/tools/DealCalculatorModal';
import { WhatsAppTemplatesModal } from './components/tools/WhatsAppTemplatesModal';
import { WhatsAppConnectModal } from './components/whatsapp/WhatsAppConnectModal';
import { LeadWhatsAppWindow } from './components/whatsapp/LeadWhatsAppWindow';
import { WebsiteApiModal } from './components/tools/WebsiteApiModal';
import { WhatsAppPropertyInboxModal } from './components/properties/WhatsAppPropertyInboxModal';
import { storage } from './services/storage';
import { useAuth } from './lib/auth-context';
import {
  addCallLogInSupabase,
  createLeadInSupabase,
  createPropertyInSupabase,
  deleteLeadInSupabase,
  deletePropertyInSupabase,
  fetchLeadsFromSupabase,
  fetchPropertiesFromSupabase,
  fetchSaraswatiProjectsFromSupabase,
  scheduleVisitInSupabase,
  updateLeadStageInSupabase,
  updatePropertyStatusInSupabase,
} from './services/supabaseDb';
import {
  ResaleLead,
  ResaleProperty,
  SaraswatiProject,
  LeadStage,
  PropertyStatus,
  CallLog,
  ScheduledVisit,
} from './types/crm';
import { Building2, ArrowRight } from 'lucide-react';
import { updateDynamicKnowledgeBase } from './services/knowledgeBaseService';
import { fetchWhatsAppSessions } from './services/whatsappService';

export function App() {
  const { user, profiles, isLoading: authLoading, isLiveSupabase, signOut } = useAuth();

  const [currentTab, setCurrentTab] = useState<CrmTab>('leads');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('rd.sidebarCollapsed') !== '0';
    } catch {
      return true;
    }
  });
  const [activeDesk, setActiveDesk] = useState<'resale' | 'sales'>('resale');

  // Core Data State
  const [properties, setProperties] = useState<ResaleProperty[]>([]);
  const [leads, setLeads] = useState<ResaleLead[]>([]);
  const [saraswatiProjects, setSaraswatiProjects] = useState<SaraswatiProject[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals & Drawers
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isWhatsAppConnectOpen, setIsWhatsAppConnectOpen] = useState(false);
  const [isWhatsAppPropertyInboxOpen, setIsWhatsAppPropertyInboxOpen] = useState(false);
  const [isWebsiteApiOpen, setIsWebsiteApiOpen] = useState(false);
  const [propertyPrefill, setPropertyPrefill] = useState<Partial<ResaleProperty> | null>(null);
  const [openWithWhatsAppImport, setOpenWithWhatsAppImport] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState<ResaleLead | null>(null);
  const [whatsAppDraft, setWhatsAppDraft] = useState<string | null>(null);
  const [whatsAppLive, setWhatsAppLive] = useState(false);

  const [activeLead, setActiveLead] = useState<ResaleLead | null>(null);
  const [activeProperty, setActiveProperty] = useState<ResaleProperty | null>(null);

  const [matcherLead, setMatcherLead] = useState<ResaleLead | null>(null);
  const [matcherProperty, setMatcherProperty] = useState<ResaleProperty | null>(null);

  // Toast / notification banner
  const [notification, setNotification] = useState<{ msg: string; tone?: 'ok' | 'err' } | null>(null);

  const showNotification = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setNotification({ msg, tone });
    setTimeout(() => setNotification(null), 3800);
  }, []);

  // Load data from Supabase (when signed in) merged seamlessly with local inventory
  const reloadData = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);

    try {
      if (isLiveSupabase) {
        const [leadsRes, propsRes, projectsRes] = await Promise.all([
          fetchLeadsFromSupabase(activeDesk, profiles),
          fetchPropertiesFromSupabase(),
          fetchSaraswatiProjectsFromSupabase(),
        ]);

        if (leadsRes.error) {
          console.warn('Leads sync:', leadsRes.error);
          showNotification(`Leads sync: ${leadsRes.error}`, 'err');
          const localLeads = storage.getLeads();
          if (localLeads.length > 0) setLeads(localLeads);
        } else if (leadsRes.data && leadsRes.data.length > 0) {
          setLeads(leadsRes.data);
          setActiveLead((prev) => (prev ? leadsRes.data.find((l) => l.id === prev.id) || null : null));
        } else {
          setLeads(storage.getLeads());
        }

        // Merge properties seamlessly: remote + local so nothing is ever lost
        const localProps = storage.getProperties();
        const remoteProps = propsRes.data || [];
        const remoteIds = new Set(remoteProps.map((p) => p.id));
        const mergedProps = [...remoteProps, ...localProps.filter((p) => !remoteIds.has(p.id))];
        setProperties(mergedProps);
        setActiveProperty((prev) => (prev ? mergedProps.find((p) => p.id === prev.id) || null : null));

        if (!projectsRes.error && projectsRes.data) {
          setSaraswatiProjects(projectsRes.data);
        }

        // Auto-update live AI Knowledge Base with fresh database inventory
        updateDynamicKnowledgeBase().catch(() => {});
      } else {
        setProperties(storage.getProperties());
        setLeads(storage.getLeads());
        updateDynamicKnowledgeBase().catch(() => {});
      }
    } catch (err) {
      console.error('Data reload error:', err);
      setProperties(storage.getProperties());
      setLeads(storage.getLeads());
    } finally {
      setIsSyncing(false);
    }
  }, [user, isLiveSupabase, activeDesk, profiles, showNotification]);

  useEffect(() => {
    if (user) {
      reloadData();
    }
  }, [user, reloadData]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchWhatsAppSessions()
      .then((res) => {
        if (!cancelled) setWhatsAppLive(res.sessions.some((s) => s.status === 'connected') || Boolean(res.activeSession && res.activeSession.status === 'connected'));
      })
      .catch(() => {
        if (!cancelled) setWhatsAppLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, isWhatsAppConnectOpen, whatsAppLead]);

  const openWhatsAppForLead = useCallback((lead: ResaleLead, draft?: string) => {
    setWhatsAppDraft(draft || null);
    setWhatsAppLead(lead);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('rd.sidebarCollapsed', next ? '1' : '0');
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  // Handler: Add Lead
  const handleSaveLead = async (
    newLeadData: Omit<ResaleLead, 'id' | 'leadCode' | 'createdAt' | 'updatedAt' | 'callLogs' | 'visits'>
  ) => {
    if (isLiveSupabase && user) {
      const res = await createLeadInSupabase(newLeadData, user.id, profiles);
      if (res.error) {
        showNotification(res.error, 'err');
        throw new Error(res.error);
      }
      await reloadData();
      showNotification(`Lead "${res.data?.name}" (${res.data?.leadCode}) saved to Saraswati Nagri Supabase!`);
      return;
    }

    const created = storage.saveLead(newLeadData);
    reloadData();
    showNotification(`Lead "${created.name}" (${created.leadCode}) saved locally!`);
  };

  // Handler: Add Property (Completely smooth and resilient)
  const handleSaveProperty = async (
    newPropertyData: Omit<ResaleProperty, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    // 1. Always persist locally first so agent's work is 100% safe
    const localCreated = storage.saveProperty(newPropertyData);

    // 2. Try Supabase in the background if live Supabase is active
    if (isLiveSupabase && user) {
      try {
        const res = await createPropertyInSupabase(newPropertyData, user.id);
        if (res.data) {
          await reloadData();
          showNotification(`Property "${res.data.title}" registered successfully!`);
        }
      } catch (err) {
        // Handled silently in background
      }

      // 3. Also register seller lead into Saraswati Nagri CRM public.leads table so it appears across the whole CRM!
      if (newPropertyData.owner.phone && newPropertyData.owner.phone.trim().length >= 10) {
        try {
          await createLeadInSupabase({
            name: newPropertyData.owner.name || 'Property Owner',
            phone: newPropertyData.owner.phone,
            whatsapp: newPropertyData.owner.whatsapp || newPropertyData.owner.phone,
            entity: 'Saraswati Nagri',
            intent: newPropertyData.transactionType === 'rent'
              ? 'Wants to Rent Out Their Property'
              : 'Wants to Sell Their Property (House/Villa/Farm)',
            propertyCategory: newPropertyData.category,
            plotInterest: newPropertyData.category === 'flat' ? 'Flat' : newPropertyData.category === 'house_villa' ? 'House/Villa' : 'Plot',
            bhkPreference: [newPropertyData.bhk || '3 BHK'],
            preferredLocalities: [newPropertyData.locality],
            budgetDisplay: newPropertyData.price,
            budgetMin: newPropertyData.priceNumeric,
            budgetMax: newPropertyData.priceNumeric,
            source: 'Resale Property Listing',
            priority: 'warm',
            stage: 'new',
            timeline: 'immediate',
            assignedTo: 'Sagar Madhukar kamble',
            assignedToId: 'a342167a-c988-49cc-b304-29aed3fc81b4',
            notes: `Registered resale property: ${newPropertyData.title} in ${newPropertyData.locality} (${newPropertyData.price}). ${newPropertyData.description}`
          }, user.id, profiles);
        } catch (e) {
          console.warn('Seller lead registration note:', e);
        }
      }
    }

    await reloadData();
    showNotification(`Property "${localCreated.title}" registered successfully!`);
  };

  // Handler: Update Lead Stage
  const handleUpdateLeadStage = async (leadId: string, stage: LeadStage) => {
    if (isLiveSupabase && user) {
      const res = await updateLeadStageInSupabase(leadId, stage, user.id);
      if (res.error) {
        showNotification(res.error, 'err');
        return;
      }
      await reloadData();
      showNotification(`Stage updated to ${stage.replace('_', ' ').toUpperCase()}`);
      return;
    }

    const updated = storage.updateLead(leadId, { stage });
    if (updated) {
      reloadData();
      setActiveLead(updated);
      showNotification(`Stage updated to ${stage.replace('_', ' ').toUpperCase()}`);
    }
  };

  // Handler: Update Property Status
  const handleUpdatePropertyStatus = async (propId: string, status: PropertyStatus) => {
    storage.updateProperty(propId, { status });
    if (isLiveSupabase) {
      try {
        await updatePropertyStatusInSupabase(propId, status);
      } catch (e) {
        // Background sync
      }
    }
    await reloadData();
    showNotification(`Property status changed to ${status.replace('_', ' ').toUpperCase()}`);
  };

  // Handler: Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    storage.deleteLead(leadId);
    if (isLiveSupabase) {
      const res = await deleteLeadInSupabase(leadId);
      if (res.error) {
        showNotification(res.error, 'err');
        return;
      }
    }
    setActiveLead(null);
    await reloadData();
    showNotification('Lead permanently deleted');
  };

  // Handler: Delete Property
  const handleDeleteProperty = async (propId: string) => {
    storage.deleteProperty(propId);
    if (isLiveSupabase) {
      try {
        await deletePropertyInSupabase(propId);
      } catch (e) {
        // Background sync
      }
    }
    setActiveProperty(null);
    await reloadData();
    showNotification('Property removed from inventory');
  };

  // Handler: Add Call Log
  const handleAddCallLog = async (leadId: string, log: Omit<CallLog, 'id' | 'date'>) => {
    storage.addCallLog(leadId, log);

    if (isLiveSupabase && user) {
      const target = leads.find((l) => l.id === leadId);
      const res = await addCallLogInSupabase(leadId, log, user.id, target?.interactionCount || 0);
      if (res.error) {
        showNotification(res.error, 'err');
      } else {
        showNotification(`Call outcome "${log.outcome}" saved & synced to Saraswati Nagri CRM!`);
      }
    } else {
      showNotification(`Call outcome "${log.outcome}" recorded!`);
    }

    await reloadData();
    const updatedLead = storage.getLeadById(leadId) || leads.find((l) => l.id === leadId);
    if (updatedLead) setActiveLead(updatedLead);
  };

  // Handler: Schedule Visit
  const handleScheduleVisit = async (leadId: string, visit: Omit<ScheduledVisit, 'id'>) => {
    if (isLiveSupabase && user) {
      const res = await scheduleVisitInSupabase(leadId, visit, user.id);
      if (res.error) {
        showNotification(res.error, 'err');
        return;
      }
      await reloadData();
      showNotification(`Site visit scheduled for ${visit.date} at ${visit.time}`);
      return;
    }

    storage.scheduleVisit(leadId, visit);
    reloadData();
    const updatedLead = storage.getLeadById(leadId);
    if (updatedLead) setActiveLead(updatedLead);
    showNotification(`Site visit scheduled for ${visit.date} at ${visit.time}`);
  };

  const handleOpenSmartMatcherForLead = (lead: ResaleLead) => {
    setMatcherLead(lead);
    setMatcherProperty(null);
    setCurrentTab('matcher');
  };

  const handleOpenSmartMatcherForProperty = (prop: ResaleProperty) => {
    setMatcherProperty(prop);
    setMatcherLead(null);
    setCurrentTab('matcher');
  };

  const handleToggleDesk = () => {
    const next = activeDesk === 'resale' ? 'sales' : 'resale';
    setActiveDesk(next);
    showNotification(
      next === 'resale'
        ? 'Switched to Nagpur Properties Resale Desk'
        : 'Switched to Saraswati Nagri Plot Sales Desk'
    );
  };

  const handleExportLeadsCsv = () => {
    const csv = storage.exportLeadsToCSV(leads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saraswati-nagri-${activeDesk}-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${leads.length} leads to CSV`);
  };

  // Auth Loading Gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7fe] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Connecting to Saraswati Nagri CRM...</p>
      </div>
    );
  }

  // Sign-In Screen Gate
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full bg-[#f4f7fe] text-slate-800 flex flex-col md:flex-row font-sans antialiased overflow-x-hidden">
      {/* Toast Notification Alert */}
      {notification && (
        <div
          className={`fixed top-16 right-5 z-[90] px-4 py-3 rounded-2xl text-white shadow-2xl font-semibold text-xs flex items-center gap-2.5 border ${
            notification.tone === 'err'
              ? 'bg-rose-600 border-rose-500'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              notification.tone === 'err' ? 'bg-white' : 'bg-emerald-400'
            } animate-pulse`}
          />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Saraswati Nagri Collapsible Sidebar Rail + Mobile Bottom Bar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenWhatsAppConnect={() => setIsWhatsAppConnectOpen(true)}
        onOpenWebsiteApi={() => setIsWebsiteApiOpen(true)}
        totalLeads={leads.length}
        totalProperties={properties.length}
        currentUser={user}
        isLiveSupabase={isLiveSupabase}
        whatsAppLive={whatsAppLive}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-[100dvh] w-full min-w-0 max-w-full pb-20 md:pb-0 overflow-x-hidden transition-all duration-200 ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
        }`}
      >
        <Navbar
          currentTab={currentTab}
          onOpenAddLead={() => setIsAddLeadOpen(true)}
          onOpenAddProperty={() => setIsAddPropertyOpen(true)}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenWhatsAppConnect={() => setIsWhatsAppConnectOpen(true)}
          onRefreshSync={reloadData}
          isSyncing={isSyncing}
          isLiveSupabase={isLiveSupabase}
          activeDesk={activeDesk}
          onToggleDesk={handleToggleDesk}
          currentUser={user}
          onSignOut={signOut}
          whatsAppLive={whatsAppLive}
        />

        {/* Desk Switcher Context Strip */}
        {activeDesk === 'sales' && (
          <div className="bg-purple-600 text-white px-3 sm:px-6 md:px-8 py-2 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-200 shrink-0" />
              <span>
                Viewing <strong>Saraswati Nagri Plot Sales Leads</strong> from Supabase. Switch back anytime for Nagpur Properties Resale Desk.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveDesk('resale')}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0 cursor-pointer self-end sm:self-auto"
            >
              <span>Open Resale Desk</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Page Content (With bottom padding for fixed mobile nav bar) */}
        <main className="flex-1 min-h-0 w-full min-w-0 max-w-full p-2.5 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8 overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardOverview
              properties={properties}
              leads={leads}
              onSelectTab={setCurrentTab}
              onOpenAddLead={() => setIsAddLeadOpen(true)}
              onOpenAddProperty={() => setIsAddPropertyOpen(true)}
              onViewLead={setActiveLead}
              onViewProperty={setActiveProperty}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsDesk
              leads={leads}
              activeDesk={activeDesk}
              profiles={profiles}
              onOpenAddLead={() => setIsAddLeadOpen(true)}
              onViewLead={setActiveLead}
              onUpdateLeadStage={handleUpdateLeadStage}
              onDeleteLead={handleDeleteLead}
              onOpenSmartMatcherForLead={handleOpenSmartMatcherForLead}
              onOpenWhatsAppChat={openWhatsAppForLead}
              onExportCsv={handleExportLeadsCsv}
              onAddCallLog={handleAddCallLog}
            />
          )}

          {currentTab === 'properties' && (
            <PropertiesDesk
              properties={properties}
              saraswatiProjects={saraswatiProjects}
              onOpenAddProperty={() => {
                setPropertyPrefill(null);
                setOpenWithWhatsAppImport(false);
                setIsAddPropertyOpen(true);
              }}
              onOpenAddFromWhatsApp={() => {
                setPropertyPrefill(null);
                setOpenWithWhatsAppImport(true);
                setIsAddPropertyOpen(true);
              }}
              onOpenWhatsAppPropertyInbox={() => setIsWhatsAppPropertyInboxOpen(true)}
              onOpenWhatsAppConnect={() => setIsWhatsAppConnectOpen(true)}
              onViewProperty={setActiveProperty}
              onUpdatePropertyStatus={handleUpdatePropertyStatus}
              onDeleteProperty={handleDeleteProperty}
              onOpenSmartMatcherForProperty={handleOpenSmartMatcherForProperty}
            />
          )}

          {currentTab === 'matcher' && (
            <SmartMatcherModal
              leads={leads}
              properties={properties}
              initialSelectedLead={matcherLead}
              initialSelectedProperty={matcherProperty}
              onViewLead={setActiveLead}
              onViewProperty={setActiveProperty}
            />
          )}

          {currentTab === 'visits' && (
            <SiteVisitsDesk
              leads={leads}
              properties={properties}
              onViewLead={setActiveLead}
              onViewProperty={setActiveProperty}
            />
          )}
        </main>
      </div>

      {/* Conditionally Mounted Modals */}
      {isAddLeadOpen && (
        <AddLeadModal
          isOpen={isAddLeadOpen}
          onClose={() => setIsAddLeadOpen(false)}
          existingLeads={leads}
          profiles={profiles}
          onSaveLead={handleSaveLead}
        />
      )}

      {isAddPropertyOpen && (
        <AddPropertyModal
          isOpen={isAddPropertyOpen}
          onClose={() => {
            setIsAddPropertyOpen(false);
            setPropertyPrefill(null);
            setOpenWithWhatsAppImport(false);
          }}
          onSaveProperty={handleSaveProperty}
          initialPrefill={propertyPrefill}
          defaultOpenWhatsAppImport={openWithWhatsAppImport}
          onOpenWhatsAppConnect={() => setIsWhatsAppConnectOpen(true)}
        />
      )}

      {isWhatsAppPropertyInboxOpen && (
        <WhatsAppPropertyInboxModal
          isOpen={isWhatsAppPropertyInboxOpen}
          onClose={() => setIsWhatsAppPropertyInboxOpen(false)}
          onInsertIntoForm={(prefill) => {
            setPropertyPrefill(prefill);
            setOpenWithWhatsAppImport(true);
            setIsAddPropertyOpen(true);
          }}
          onQuickPublish={async (newProp) => {
            await handleSaveProperty(newProp);
            showNotification('Property published from WhatsApp directly to CRM inventory!', 'ok');
          }}
          onOpenWhatsAppConnect={() => setIsWhatsAppConnectOpen(true)}
        />
      )}

      {activeLead && (
        <LeadDetailModal
          lead={activeLead}
          properties={properties}
          isOpen={Boolean(activeLead)}
          onClose={() => setActiveLead(null)}
          onUpdateStage={handleUpdateLeadStage}
          onAddCallLog={handleAddCallLog}
          onScheduleVisit={handleScheduleVisit}
          onOpenWhatsAppChat={openWhatsAppForLead}
          onDeleteLead={handleDeleteLead}
        />
      )}

      {/* Full in-CRM WhatsApp Window (Exact Saraswati Nagri CRM overlay) */}
      {whatsAppLead && (
        <LeadWhatsAppWindow
          lead={whatsAppLead}
          leadName={whatsAppLead.name}
          leadId={whatsAppLead.id}
          phone={whatsAppLead.whatsapp || whatsAppLead.phone}
          stage={whatsAppLead.rawStatus || whatsAppLead.stage}
          projectName={whatsAppLead.plotInterest || 'Nagpur Properties · Resale Desk'}
          onClose={() => {
            setWhatsAppLead(null);
            setWhatsAppDraft(null);
          }}
          onConnect={() => setIsWhatsAppConnectOpen(true)}
          variant="overlay"
          initialDraft={whatsAppDraft}
          properties={properties}
          onConvertToProperty={(prefill) => {
            setPropertyPrefill(prefill);
            setOpenWithWhatsAppImport(true);
            setIsAddPropertyOpen(true);
            setWhatsAppLead(null);
          }}
        />
      )}

      {activeProperty && (
        <PropertyDetailModal
          property={activeProperty}
          leads={leads}
          isOpen={Boolean(activeProperty)}
          onClose={() => setActiveProperty(null)}
          onUpdateStatus={handleUpdatePropertyStatus}
          onSelectLeadForMatching={handleOpenSmartMatcherForLead}
        />
      )}

      {isBackupOpen && (
        <DataToolsModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
          onDataChanged={reloadData}
          leads={leads}
          properties={properties}
        />
      )}

      {isCalculatorOpen && (
        <DealCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
      )}

      {isTemplatesOpen && (
        <WhatsAppTemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
        />
      )}

      {isWhatsAppConnectOpen && (
        <WhatsAppConnectModal
          isOpen={isWhatsAppConnectOpen}
          onClose={() => setIsWhatsAppConnectOpen(false)}
        />
      )}

      {isWebsiteApiOpen && (
        <WebsiteApiModal
          isOpen={isWebsiteApiOpen}
          onClose={() => setIsWebsiteApiOpen(false)}
        />
      )}
    </div>
  );
}

export default App;

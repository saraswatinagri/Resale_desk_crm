import { ResaleProperty, ResaleLead, CallLog, ScheduledVisit } from '../types/crm';
import { INITIAL_PROPERTIES } from '../data/mockProperties';
import { INITIAL_LEADS } from '../data/mockLeads';

const STORAGE_KEYS = {
  PROPERTIES: 'resale_desk_crm_properties',
  LEADS: 'resale_desk_crm_leads',
  INITIALIZED: 'resale_desk_crm_initialized'
};

class StorageService {
  private properties: ResaleProperty[] = [];
  private leads: ResaleLead[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedProps = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      const storedLeads = localStorage.getItem(STORAGE_KEYS.LEADS);

      if (storedProps) {
        this.properties = JSON.parse(storedProps);
      } else {
        this.properties = INITIAL_PROPERTIES;
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(this.properties));
      }

      if (storedLeads) {
        this.leads = JSON.parse(storedLeads);
      } else {
        this.leads = INITIAL_LEADS;
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(this.leads));
      }
    } catch (e) {
      console.warn('LocalStorage error or unavailable, falling back to in-memory datasets', e);
      this.properties = INITIAL_PROPERTIES;
      this.leads = INITIAL_LEADS;
    }
  }

  // --- PROPERTIES ---
  public getProperties(): ResaleProperty[] {
    return [...this.properties];
  }

  public getPropertyById(id: string): ResaleProperty | undefined {
    return this.properties.find(p => p.id === id);
  }

  public saveProperty(property: Omit<ResaleProperty, 'id' | 'createdAt' | 'updatedAt'>): ResaleProperty {
    const newProperty: ResaleProperty = {
      ...property,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.properties.unshift(newProperty);
    this.persistProperties();
    return newProperty;
  }

  public updateProperty(id: string, updates: Partial<ResaleProperty>): ResaleProperty | null {
    const index = this.properties.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.properties[index] = {
      ...this.properties[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.persistProperties();
    return this.properties[index];
  }

  public deleteProperty(id: string): boolean {
    const initialLen = this.properties.length;
    this.properties = this.properties.filter(p => p.id !== id);
    if (this.properties.length !== initialLen) {
      this.persistProperties();
      return true;
    }
    return false;
  }

  private persistProperties() {
    try {
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(this.properties));
    } catch (e) {
      console.error('Failed to persist properties', e);
    }
  }

  // --- LEADS ---
  public getLeads(): ResaleLead[] {
    return [...this.leads];
  }

  public getLeadById(id: string): ResaleLead | undefined {
    return this.leads.find(l => l.id === id);
  }

  public saveLead(lead: Omit<ResaleLead, 'id' | 'leadCode' | 'createdAt' | 'updatedAt' | 'callLogs' | 'visits'>): ResaleLead {
    const nextCodeNumber = 1000 + this.leads.length + 1;
    const newLead: ResaleLead = {
      ...lead,
      id: `lead-${Date.now()}`,
      leadCode: `RD-${nextCodeNumber}`,
      callLogs: [],
      visits: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.leads.unshift(newLead);
    this.persistLeads();
    return newLead;
  }

  public updateLead(id: string, updates: Partial<ResaleLead>): ResaleLead | null {
    const index = this.leads.findIndex(l => l.id === id);
    if (index === -1) return null;

    this.leads[index] = {
      ...this.leads[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.persistLeads();
    return this.leads[index];
  }

  public addCallLog(leadId: string, log: Omit<CallLog, 'id' | 'date'>): CallLog | null {
    const lead = this.getLeadById(leadId);
    if (!lead) return null;

    const newLog: CallLog = {
      ...log,
      id: `cl-${Date.now()}`,
      date: new Date().toISOString()
    };

    if (!lead.callLogs) lead.callLogs = [];
    lead.callLogs.unshift(newLog);
    this.updateLead(leadId, { callLogs: lead.callLogs });
    return newLog;
  }

  public scheduleVisit(leadId: string, visit: Omit<ScheduledVisit, 'id'>): ScheduledVisit | null {
    const lead = this.getLeadById(leadId);
    if (!lead) return null;

    const newVisit: ScheduledVisit = {
      ...visit,
      id: `vis-${Date.now()}`
    };

    if (!lead.visits) lead.visits = [];
    lead.visits.unshift(newVisit);
    
    // Automatically advance stage to visit_scheduled if currently new or contacted
    const nextStage = lead.stage === 'new' || lead.stage === 'contacted' ? 'visit_scheduled' : lead.stage;
    this.updateLead(leadId, { 
      visits: lead.visits,
      stage: nextStage,
      nextFollowUp: `${visit.date}T${visit.time}:00`
    });

    return newVisit;
  }

  public deleteLead(id: string): boolean {
    const initialLen = this.leads.length;
    this.leads = this.leads.filter(l => l.id !== id);
    if (this.leads.length !== initialLen) {
      this.persistLeads();
      return true;
    }
    return false;
  }

  private persistLeads() {
    try {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(this.leads));
    } catch (e) {
      console.error('Failed to persist leads', e);
    }
  }

  // --- EXPORT & RESET ---
  public resetToDemoData() {
    this.properties = [...INITIAL_PROPERTIES];
    this.leads = [...INITIAL_LEADS];
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(this.properties));
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(this.leads));
  }

  public exportLeadsToCSV(leadsList: ResaleLead[] = this.leads): string {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Code', 'Name', 'Phone', 'Looking For', 'Areas', 'Budget', 'Stage', 'Priority', 'Source', 'Assigned To', 'Created At'];
    const rows = leadsList.map((l) => [
      l.leadCode,
      l.name,
      l.phone,
      l.intent,
      l.preferredLocalities.join('; '),
      l.budgetDisplay,
      l.rawStatus || l.stage,
      l.priority,
      l.source,
      l.assignedTo,
      l.createdAt,
    ]);
    return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  }

  public exportBackupJson(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      properties: this.properties,
      leads: this.leads
    };
    return JSON.stringify(backup, null, 2);
  }

  public importBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.properties) && Array.isArray(data.leads)) {
        this.properties = data.properties;
        this.leads = data.leads;
        this.persistProperties();
        this.persistLeads();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse backup JSON', e);
      return false;
    }
  }
}

export const storage = new StorageService();


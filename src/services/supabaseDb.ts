import { supabase } from '../lib/supabase';
import {
  CallLog,
  CrmUserProfile,
  LeadPriority,
  LeadStage,
  PropertyStatus,
  ResaleLead,
  ResaleProperty,
  SaraswatiProject,
  ScheduledVisit,
} from '../types/crm';
import {
  RESALE_PROPERTY_TYPES,
  categoryToPlotInterest,
  dbStatusToLeadStage,
  formatBudgetShort,
  isResaleIntent,
  leadCodeFor,
  leadStageToDbStatus,
  plotInterestToCategory,
} from '../lib/resale';

export interface SupabaseFetchResult<T> {
  data: T[];
  error?: string;
  tableMissing?: boolean;
}

function asStr(val: unknown, fallback = ''): string {
  return typeof val === 'string' && val.trim() ? val.trim() : fallback;
}

function asNum(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function normalizePhone10(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10) || raw.trim();
}

function isTableMissingError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    /could not find the table|does not exist/i.test(err.message || '')
  );
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchProfilesFromSupabase(): Promise<SupabaseFetchResult<CrmUserProfile>> {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, avatar, color, is_active, department')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  const mapped: CrmUserProfile[] = (data || []).map((row: Record<string, unknown>) => {
    const fullName = asStr(row.full_name, 'CRM User');
    const avatarRaw = asStr(row.avatar);
    const avatar =
      avatarRaw && avatarRaw.length <= 2 && !avatarRaw.includes('/')
        ? avatarRaw
        : fullName.charAt(0).toUpperCase();
    return {
      id: asStr(row.id),
      fullName,
      email: asStr(row.email),
      phone: asStr(row.phone),
      role: asStr(row.role, 'Sales Agent'),
      avatar,
      color: asStr(row.color, 'from-purple-500 to-indigo-600'),
      isActive: row.is_active !== false,
      department: asStr(row.department),
    };
  });

  return { data: mapped };
}

// ── Saraswati Nagri Projects (Layouts) ───────────────────────────────────────

export async function fetchSaraswatiProjectsFromSupabase(): Promise<SupabaseFetchResult<SaraswatiProject>> {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('projects')
    .select('*, plot_inventory(id, status)')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message, tableMissing: isTableMissingError(error) };
  }

  const mapped: SaraswatiProject[] = (data || []).map((p: Record<string, unknown>) => {
    const plots = Array.isArray(p.plot_inventory)
      ? (p.plot_inventory as Array<{ id: string; status: string | null }>)
      : [];
    const totalPlots = plots.length > 0 ? plots.length : Number(p.total_plots || 0);
    const soldPlots = plots.filter((x) =>
      ['Sold', 'Booked', 'Agreement Done', 'Registry Done'].includes(x.status || '')
    ).length;
    const vacantPlots = Math.max(0, totalPlots - soldPlots);

    return {
      id: asStr(p.id),
      name: asStr(p.name, 'Saraswati Nagri Layout'),
      projectCode: asStr(p.project_code),
      location: asStr(p.location, 'Nagpur'),
      status: asStr(p.status, 'Active'),
      totalPlots,
      soldPlots,
      vacantPlots,
      totalArea: asStr(p.total_area),
      description: asStr(p.description),
      priceDisplay: asStr(p.price_display),
      pricePerSqft: asNum(p.price_per_sqft),
      projectType: (p.project_type as 'own_development' | 'associate_mandate') || 'own_development',
      developerName: asStr(p.developer_name),
      reraNumber: asStr(p.rera_number),
      nmrdaNumber: asStr(p.nmrda_number),
      amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
      brandPrimaryColor: asStr(p.brand_primary_color, '#F59E0B'),
    };
  });

  return { data: mapped };
}

// ── Leads (Connected directly to public.leads & public.lead_interactions) ────

function computePriorityFromRow(row: Record<string, unknown>): LeadPriority {
  const label = asStr(row.score_label).toLowerCase();
  if (label === 'hot') return 'hot';
  if (label === 'warm') return 'warm';
  if (label === 'cold') return 'cold';
  const status = asStr(row.status);
  if (['Site Visit Done', 'Negotiation', 'Token Paid', 'Token Pending Verification'].includes(status)) {
    return 'hot';
  }
  const urgency = asStr(row.urgency).toLowerCase();
  if (urgency.startsWith('immediate')) return 'hot';
  if (urgency.startsWith('short') || status === 'Follow-up' || status === 'Site Visit Scheduled') {
    return 'warm';
  }
  return 'cold';
}

function mapTimelineFromUrgency(urgency?: string | null): ResaleLead['timeline'] {
  const u = (urgency || '').toLowerCase();
  if (u.startsWith('immediate')) return 'immediate';
  if (u.startsWith('short')) return '1_month';
  if (u.startsWith('medium')) return '3_months';
  return 'exploring';
}

function mapLeadRow(
  row: Record<string, unknown>,
  profileMap: Map<string, string>,
  interactions: Array<Record<string, unknown>>
): ResaleLead {
  const id = asStr(row.id);
  const assignedToId = asStr(row.assigned_to) || null;
  const assignedName = assignedToId ? profileMap.get(assignedToId) || 'Assigned Executive' : 'Unassigned';

  const budgetMin = asNum(row.budget_min);
  const budgetMax = asNum(row.budget_max);
  const budgetText = asStr(row.budget);
  const budgetDisplay =
    budgetMin || budgetMax ? formatBudgetShort(budgetMin, budgetMax) : budgetText || 'Budget missing';

  const locationRaw = asStr(row.location_preference) || asStr(row.city);
  const preferredLocalities = locationRaw
    ? locationRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Nagpur'];

  const sizePrefRaw = asStr(row.plot_size_preference);
  const bhkPreference =
    sizePrefRaw && sizePrefRaw !== 'Any'
      ? sizePrefRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const callLogs: CallLog[] = [];
  const visits: ScheduledVisit[] = [];

  for (const item of interactions) {
    const itemType = asStr(item.type);
    const createdBy = asStr(item.created_by);
    const actor = (createdBy && profileMap.get(createdBy)) || assignedName;

    if (itemType === 'site_visit') {
      const schedDate = asStr(item.scheduled_date) || asStr(item.created_at);
      visits.push({
        id: asStr(item.id),
        propertyTitle: asStr(item.visit_location, 'Property Site Visit'),
        propertyLocality: preferredLocalities[0] || 'Nagpur',
        date: schedDate ? schedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        time: asStr(item.scheduled_time, '11:00 AM'),
        status: asStr(item.outcome).toLowerCase().includes('done') ? 'completed' : 'scheduled',
        agent: actor,
        feedback: asStr(item.content),
      });
    } else if (itemType === 'call' || itemType === 'note' || itemType === 'whatsapp') {
      const outcomeRaw = asStr(item.outcome, 'Interested') as CallLog['outcome'];
      callLogs.push({
        id: asStr(item.id),
        date: asStr(item.created_at, new Date().toISOString()),
        caller: actor,
        notes: asStr(item.content, outcomeRaw || 'Logged activity'),
        outcome: outcomeRaw,
      });
    }
  }

  const rawStatus = asStr(row.status, 'New Inquiry');
  const propertyType = asStr(row.property_type, 'Wants to Buy a Property (Resale)');
  const plotInterest = asStr(row.plot_interest);

  return {
    id,
    leadCode: leadCodeFor(row.lead_no, id),
    leadNo: asNum(row.lead_no),
    name: asStr(row.name, 'Unnamed Lead'),
    phone: asStr(row.phone),
    whatsapp: asStr(row.whatsapp) || asStr(row.phone),
    email: asStr(row.email) || undefined,
    entity: asStr(row.entity, 'Saraswati Nagri'),
    intent: propertyType,
    plotInterest,
    propertyCategory: plotInterestToCategory(plotInterest),
    bhkPreference,
    preferredLocalities,
    purposeOfBuying: asStr(row.purpose_of_buying),
    budgetMin,
    budgetMax,
    budgetDisplay,
    timeline: mapTimelineFromUrgency(asStr(row.urgency)),
    source: asStr(row.source, 'Walk-in'),
    priority: computePriorityFromRow(row),
    stage: dbStatusToLeadStage(rawStatus),
    rawStatus,
    assignedTo: assignedName,
    assignedToId,
    nextFollowUp: asStr(row.follow_up_date) || undefined,
    lastContactedAt: asStr(row.last_contacted_at) || null,
    interactionCount: asNum(row.interaction_count) || callLogs.length,
    siteVisitDate: asStr(row.site_visit_date) || null,
    aiScore: asNum(row.score_value),
    aiReason: asStr(row.score_reason) || undefined,
    notes: asStr(row.notes),
    callLogs,
    visits,
    interestedPropertyIds: [],
    createdAt: asStr(row.created_at, new Date().toISOString()),
    updatedAt: asStr(row.updated_at, asStr(row.created_at, new Date().toISOString())),
  };
}

export async function fetchLeadsFromSupabase(
  desk: 'resale' | 'sales' | 'all',
  profiles: CrmUserProfile[]
): Promise<SupabaseFetchResult<ResaleLead>> {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const profileMap = new Map(profiles.map((p) => [p.id, p.fullName]));

  let query = supabase
    .from('leads')
    .select(
      'id, lead_no, name, phone, whatsapp, email, entity, property_type, plot_interest, source, purpose_of_buying, budget, budget_min, budget_max, plot_size_preference, urgency, status, assigned_to, follow_up_date, site_visit_date, last_contacted_at, interaction_count, location_preference, city, notes, score_value, score_label, score_reason, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(1500);

  if (desk === 'resale') {
    query = query.in('property_type', [...RESALE_PROPERTY_TYPES]);
  } else if (desk === 'sales') {
    query = query.not('property_type', 'in', `(${RESALE_PROPERTY_TYPES.map((v) => `"${v}"`).join(',')})`);
  }

  const { data: leadRows, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (leadRows || []) as Array<Record<string, unknown>>;
  const leadIds = rows.map((r) => asStr(r.id)).filter(Boolean);

  const interactionsByLead = new Map<string, Array<Record<string, unknown>>>();
  if (leadIds.length > 0) {
    // 80 ids ≈ 3 KB of URL — safely under the serverless URL limit.
    for (let i = 0; i < leadIds.length; i += 80) {
      const chunkIds = leadIds.slice(i, i + 80);
      const { data: intRows } = await supabase
        .from('lead_interactions')
        .select('id, lead_id, type, content, outcome, scheduled_date, scheduled_time, visit_location, created_by, created_at')
        .in('lead_id', chunkIds)
        .order('created_at', { ascending: false });

      for (const item of (intRows || []) as Array<Record<string, unknown>>) {
        const lid = asStr(item.lead_id);
        if (!lid) continue;
        if (!interactionsByLead.has(lid)) interactionsByLead.set(lid, []);
        interactionsByLead.get(lid)!.push(item);
      }
    }
  }

  const mapped = rows.map((r) => mapLeadRow(r, profileMap, interactionsByLead.get(asStr(r.id)) || []));
  return { data: mapped };
}

export async function createLeadInSupabase(
  leadData: Omit<ResaleLead, 'id' | 'leadCode' | 'createdAt' | 'updatedAt' | 'callLogs' | 'visits'>,
  currentUserId?: string,
  profiles: CrmUserProfile[] = []
): Promise<{ data?: ResaleLead; error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const cleanPhone = normalizePhone10(leadData.phone);
  const cleanWa = leadData.whatsapp ? normalizePhone10(leadData.whatsapp) : cleanPhone;

  // Check duplicate open lead by phone + entity (matching Saraswati Nagri CRM dedup rule)
  const { data: existing } = await supabase
    .from('leads')
    .select('id, name, status, lead_no')
    .eq('phone', cleanPhone)
    .eq('entity', 'Saraswati Nagri')
    .not('status', 'in', '("Not Interested","Converted")')
    .limit(1);

  if (existing && existing.length > 0) {
    const hit = existing[0] as Record<string, unknown>;
    return {
      error: `Duplicate phone: Lead "${asStr(hit.name)}" (${leadCodeFor(hit.lead_no, asStr(hit.id))}) already exists in status "${asStr(hit.status)}".`,
    };
  }

  const matchedAgent =
    profiles.find((p) => p.id === leadData.assignedToId || p.fullName === leadData.assignedTo) || null;

  const urgencyMap: Record<ResaleLead['timeline'], string> = {
    immediate: 'Immediate (Within 1 Month)',
    '15_days': 'Immediate (Within 1 Month)',
    '1_month': 'Short-term (1–3 Months)',
    '3_months': 'Medium-term (3–6 Months)',
    exploring: 'Just Exploring / No Timeline',
  };

  const scoreLabel =
    leadData.priority === 'hot' ? 'Hot' : leadData.priority === 'warm' ? 'Warm' : 'Cold';

  const payload = {
    name: leadData.name.trim(),
    phone: cleanPhone,
    whatsapp: cleanWa,
    email: leadData.email?.trim() || null,
    entity: 'Saraswati Nagri', // Never write 'Nagpur Properties' to leads.entity per resale.ts
    property_type: leadData.intent,
    plot_interest: leadData.plotInterest || categoryToPlotInterest(leadData.propertyCategory),
    location_preference: leadData.preferredLocalities.join(', '),
    plot_size_preference: leadData.bhkPreference.join(', ') || 'Any',
    purpose_of_buying: leadData.purposeOfBuying || (isResaleIntent(leadData.intent) ? 'Mixed Use (Self-use + Rental)' : 'Not Specified'),
    budget: leadData.budgetDisplay,
    budget_min: leadData.budgetMin ?? null,
    budget_max: leadData.budgetMax ?? null,
    source: leadData.source || 'Walk-in',
    status: leadStageToDbStatus(leadData.stage || 'new'),
    urgency: urgencyMap[leadData.timeline] || 'Not Specified',
    score_label: scoreLabel,
    assigned_to: matchedAgent?.id || currentUserId || null,
    created_by: currentUserId || null,
    follow_up_date: leadData.nextFollowUp || null,
    notes: leadData.notes || null,
  };

  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p.fullName]));
  return { data: mapLeadRow(inserted as Record<string, unknown>, profileMap, []) };
}

export async function updateLeadStageInSupabase(
  leadId: string,
  stage: LeadStage,
  currentUserId?: string
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const dbStatus = leadStageToDbStatus(stage);
  const { error } = await supabase
    .from('leads')
    .update({
      status: dbStatus,
      stage_changed_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) return { error: error.message };

  await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    type: 'status_change',
    content: `Stage moved to ${dbStatus} (from Resale Desk)`,
    outcome: dbStatus,
    created_by: currentUserId || null,
  });

  return {};
}

export async function addCallLogInSupabase(
  leadId: string,
  log: Omit<CallLog, 'id' | 'date'>,
  currentUserId?: string,
  currentInteractionCount = 0
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const scheduledDate = log.nextFollowUpDate
    ? new Date(log.nextFollowUpDate).toISOString()
    : null;

  const { error: intErr } = await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    type: 'call',
    content: log.notes,
    outcome: log.outcome,
    scheduled_date: scheduledDate,
    created_by: currentUserId || null,
  });

  if (intErr) return { error: intErr.message };

  // Status and follow-up progression matching Saraswati Nagri CRM rules
  const updates: Record<string, unknown> = {
    last_contacted_at: new Date().toISOString(),
    interaction_count: currentInteractionCount + 1,
  };

  if (scheduledDate) {
    updates.follow_up_date = scheduledDate;
  }

  if (log.outcome === 'Scheduled Visit') {
    updates.status = 'Site Visit Scheduled';
    updates.stage_changed_at = new Date().toISOString();
  } else if (log.outcome === 'Site Visit Done') {
    updates.status = 'Site Visit Done';
    updates.stage_changed_at = new Date().toISOString();
  } else if (
    [
      'Not Interested',
      'Price Too High',
      'Already Sold',
      'Already Rented',
      'Bought Elsewhere',
      'Location Not Suitable',
      'Budget Mismatch',
    ].includes(log.outcome)
  ) {
    updates.status = 'Not Interested';
    updates.stage_changed_at = new Date().toISOString();
    updates.lost_at = new Date().toISOString();
  } else if (log.outcome === 'Requirement Closed') {
    updates.status = 'Converted';
    updates.stage_changed_at = new Date().toISOString();
  } else if (log.outcome === 'Interested' || log.outcome === 'Follow-up Needed') {
    updates.status = 'Follow-up';
    updates.stage_changed_at = new Date().toISOString();
  }

  await supabase.from('leads').update(updates).eq('id', leadId);

  return {};
}

export async function scheduleVisitInSupabase(
  leadId: string,
  visit: Omit<ScheduledVisit, 'id'>,
  currentUserId?: string
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const scheduledIso = visit.date ? new Date(`${visit.date}T11:00:00+05:30`).toISOString() : new Date().toISOString();

  const { error } = await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    type: 'site_visit',
    content: visit.feedback || `Site visit scheduled for ${visit.propertyTitle || 'Resale Property'}`,
    outcome: visit.status === 'completed' ? 'Site Visit Done' : 'Site Visit Scheduled',
    scheduled_date: scheduledIso,
    scheduled_time: visit.time,
    visit_location: `${visit.propertyTitle || 'Property'} (${visit.propertyLocality || 'Nagpur'})`,
    created_by: currentUserId || null,
  });

  if (error) return { error: error.message };

  await supabase
    .from('leads')
    .update({
      status: 'Site Visit Scheduled',
      site_visit_date: scheduledIso,
      stage_changed_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  return {};
}

export async function deleteLeadInSupabase(leadId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  return error ? { error: error.message } : {};
}

// ── Resale Properties (public.resale_properties) ─────────────────────────────

function mapPropertyRow(row: Record<string, unknown>): ResaleProperty {
  return {
    id: asStr(row.id),
    propertyCode: asStr(row.property_code),
    title: asStr(row.title),
    transactionType: (asStr(row.transaction_type, 'resale') as 'resale' | 'rent'),
    category: (asStr(row.category, 'flat') as ResaleProperty['category']),
    locality: asStr(row.locality, 'Besa'),
    corridor: asStr(row.corridor, 'South Nagpur'),
    address: asStr(row.address),
    landmark: asStr(row.landmark) || undefined,
    mapsUrl: asStr(row.maps_url) || undefined,
    price: asStr(row.price, 'Price on Request'),
    priceNumeric: Number(row.price_numeric || 0),
    ratePerSqFt: asNum(row.rate_per_sqft),
    maintenanceMonthly: asNum(row.maintenance_monthly),
    areaSqFt: Number(row.area_sqft || 0),
    carpetAreaSqFt: asNum(row.carpet_area_sqft),
    bhk: asStr(row.bhk) || undefined,
    bathrooms: asNum(row.bathrooms),
    balconies: asNum(row.balconies),
    floor: asStr(row.floor) || undefined,
    furnishing: (asStr(row.furnishing) as ResaleProperty['furnishing']) || 'Semi-Furnished',
    facing: (asStr(row.facing) as ResaleProperty['facing']) || 'East',
    ageOfProperty: asStr(row.age_of_property) || 'Ready to Move',
    status: (asStr(row.status, 'available') as PropertyStatus),
    isVerified: Boolean(row.is_verified),
    verificationBadge: asStr(row.verification_badge) || undefined,
    legalStatus: (row.legal_status as ResaleProperty['legalStatus']) || {
      nmrdaApproved: true,
      reraRegistered: false,
      rlAvailable: true,
      nitApproved: false,
      clearTitle: true,
      loanEligible: true,
      eligibleBanks: [],
    },
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    highlights: Array.isArray(row.highlights) ? (row.highlights as string[]) : [],
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    description: asStr(row.description),
    owner: (row.owner as ResaleProperty['owner']) || {
      name: 'Property Owner',
      phone: '',
      negotiable: true,
    },
    assignedToId: asStr(row.assigned_to) || null,
    createdAt: asStr(row.created_at, new Date().toISOString()),
    updatedAt: asStr(row.updated_at, new Date().toISOString()),
  };
}

export async function fetchPropertiesFromSupabase(): Promise<SupabaseFetchResult<ResaleProperty>> {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('resale_properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
      tableMissing: isTableMissingError(error),
    };
  }

  return {
    data: ((data || []) as Array<Record<string, unknown>>).map(mapPropertyRow),
  };
}

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function createPropertyInSupabase(
  propData: Omit<ResaleProperty, 'id' | 'createdAt' | 'updatedAt'>,
  currentUserId?: string
): Promise<{ data?: ResaleProperty; error?: string; tableMissing?: boolean }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const code = `NP-${Math.floor(1000 + Math.random() * 9000)}`;
  const validUserUuid = isValidUuid(currentUserId) ? currentUserId : null;

  const payload = {
    property_code: code,
    title: propData.title,
    transaction_type: propData.transactionType,
    category: propData.category,
    locality: propData.locality,
    corridor: propData.corridor,
    address: propData.address,
    landmark: propData.landmark || null,
    maps_url: propData.mapsUrl || null,
    price: propData.price,
    price_numeric: propData.priceNumeric,
    rate_per_sqft: propData.ratePerSqFt || null,
    maintenance_monthly: propData.maintenanceMonthly || 0,
    area_sqft: propData.areaSqFt,
    carpet_area_sqft: propData.carpetAreaSqFt || null,
    bhk: propData.bhk || null,
    bathrooms: propData.bathrooms || 2,
    balconies: propData.balconies || 1,
    floor: propData.floor || null,
    furnishing: propData.furnishing || 'Semi-Furnished',
    facing: propData.facing || 'East',
    age_of_property: propData.ageOfProperty || 'Ready to Move',
    status: propData.status || 'available',
    is_verified: propData.isVerified,
    verification_badge: propData.verificationBadge || null,
    legal_status: propData.legalStatus,
    amenities: propData.amenities,
    highlights: propData.highlights,
    images: propData.images,
    description: propData.description,
    owner: propData.owner,
    assigned_to: validUserUuid,
    created_by: validUserUuid,
  };

  const { data, error } = await supabase
    .from('resale_properties')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return {
      error: error.message,
      tableMissing: isTableMissingError(error),
    };
  }

  return { data: mapPropertyRow(data as Record<string, unknown>) };
}

export async function updatePropertyStatusInSupabase(
  propId: string,
  status: PropertyStatus
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase
    .from('resale_properties')
    .update({ status })
    .eq('id', propId);
  return error ? { error: error.message } : {};
}

export async function deletePropertyInSupabase(propId: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from('resale_properties').delete().eq('id', propId);
  return error ? { error: error.message } : {};
}


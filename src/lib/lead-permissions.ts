import type { CrmUserProfile, ResaleLead } from '../types/crm';

/**
 * Normalizes a role string to lowercase snake/clean text.
 */
export function normRole(role: string | null | undefined): string {
  return String(role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
}

/**
 * Manager, Admin, and Leadership tier roles that have global visibility and can call/supervise any lead.
 * Matches Saraswati Nagri CRM permission tier:
 * super_admin, admin, operational_manager, sales_manager, sales_head, director, management.
 */
export function isManagerRole(role: string | null | undefined): boolean {
  const r = normRole(role);
  return (
    r.includes('admin') ||
    r.includes('super_admin') ||
    r.includes('manager') ||
    r.includes('operational_manager') ||
    r.includes('sales_manager') ||
    r.includes('sales_head') ||
    r.includes('director') ||
    r.includes('team_lead') ||
    r.includes('management')
  );
}

/**
 * Checks if the currently logged-in user is authorized to call a lead.
 *
 * Rules (Direct from Saraswati Nagri CRM):
 * 1. Admins, Directors, Sales Managers, Operational Managers, and Team Leads can call ANY lead.
 * 2. If a lead is unassigned or assigned to Office/Direct, any executive can call it to pick it up.
 * 3. Sales agents can ONLY call leads assigned to them.
 * 4. If an agent tries to call another executive's lead, calling is blocked to prevent
 *    cross-calling and poaching of another agent's assigned client.
 */
export function canUserCallLead(
  user: CrmUserProfile | null | undefined,
  lead: ResaleLead | null | undefined
): { canCall: boolean; reason?: string } {
  if (!lead) return { canCall: false, reason: 'Invalid lead' };
  if (!user) return { canCall: true }; // demo / fallback mode

  // Managers and leadership have supervisory access across all leads
  if (isManagerRole(user.role)) {
    return { canCall: true };
  }

  // Unassigned leads can be called by any salesperson
  const assigned = (lead.assignedTo || '').trim();
  if (!assigned || assigned === 'Unassigned' || assigned === 'Direct (Office)' || assigned === 'Nidhi') {
    return { canCall: true };
  }

  // Check if assigned to the current user (by full name or ID)
  const userFullName = (user.fullName || '').toLowerCase().trim();
  const assignedLower = assigned.toLowerCase();
  const isAssignedByName = assignedLower === userFullName || assignedLower.includes(userFullName) || userFullName.includes(assignedLower);
  const isAssignedById = Boolean((lead as any).assignedToId && (lead as any).assignedToId === user.id);

  if (isAssignedByName || isAssignedById) {
    return { canCall: true };
  }

  return {
    canCall: false,
    reason: `Yeh lead ${assigned} ko assigned hai. Saraswati Nagri policy ke mutabiq sirf assigned executive ya manager is lead ko call kar sakte hain.`,
  };
}

/**
 * Checks if the currently logged-in user is authorized to delete a lead.
 * Super Admin, Admin, Director, Management tier users have full authority to delete leads.
 */
export function canUserDeleteLead(user: CrmUserProfile | null | undefined): boolean {
  if (!user) return true; // fallback / demo
  const r = normRole(user.role);
  return (
    r.includes('super_admin') ||
    r.includes('superadmin') ||
    r.includes('admin') ||
    r.includes('director') ||
    r.includes('management') ||
    r.includes('manager')
  );
}

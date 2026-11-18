import React, { useState, useCallback, useRef } from 'react';
import { toast } from '../utils/toast';
import type { ResaleLead } from '../types/crm';
import { WhatsAppConnectModal } from '../components/whatsapp/WhatsAppConnectModal';

export interface LeadWhatsAppActionOptions {
  e?: React.MouseEvent;
  forceConnectModal?: boolean;
}

/**
 * Shared WhatsApp action hook replicating Saraswati Nagri CRM workflow.
 * Always opens in-CRM WhatsApp window or connection modal. Never navigates away.
 */
export function useLeadWhatsAppAction(onOpenCrmChat?: (lead: ResaleLead) => void) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<ResaleLead | null>(null);
  const pendingLeadRef = useRef<ResaleLead | null>(null);

  const startWhatsAppForLead = useCallback(
    (lead: ResaleLead, opts?: LeadWhatsAppActionOptions) => {
      opts?.e?.stopPropagation();
      const ph = lead.whatsapp || lead.phone;
      if (!ph) {
        toast.error('No WhatsApp number on file for this lead');
        return;
      }

      if (opts?.forceConnectModal) {
        pendingLeadRef.current = lead;
        setModalOpen(true);
        return;
      }

      // Set active lead to open in-CRM WhatsApp Window
      setActiveLead(lead);
      if (onOpenCrmChat) {
        onOpenCrmChat(lead);
      }
    },
    [onOpenCrmChat]
  );

  const handleConnected = useCallback(() => {
    setModalOpen(false);
    const lead = pendingLeadRef.current;
    if (lead) {
      setActiveLead(lead);
      if (onOpenCrmChat) onOpenCrmChat(lead);
    }
    pendingLeadRef.current = null;
    toast.success('WhatsApp session connected!');
  }, [onOpenCrmChat]);

  const closeChat = useCallback(() => {
    setActiveLead(null);
  }, []);

  const connectModal = (
    <WhatsAppConnectModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
    />
  );

  return {
    startWhatsAppForLead,
    connectModal,
    activeLead,
    setActiveLead,
    isChatOpen: Boolean(activeLead),
    closeChat,
    openConnectModal: () => setModalOpen(true),
  };
}

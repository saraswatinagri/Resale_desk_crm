import assert from 'node:assert/strict';
import {
  displayMessageBody,
  isAiAutoReplyEnabled,
  isStaffNumber,
  last10,
  looksLikeVisitSlip,
  normalizeLeadPhone,
  pickBestLeadMatch,
  shouldArchiveGroupMessage,
} from './phone';

assert.equal(last10('+91 89560 40220'), '8956040220');
assert.equal(normalizeLeadPhone('918956040220'), '8956040220');
assert.equal(isStaffNumber('918956040220'), true);
assert.equal(isStaffNumber('9822304910'), false);

assert.equal(looksLikeVisitSlip('Time of visit: 4pm Besa'), true);
assert.equal(shouldArchiveGroupMessage(true, '120363430117638169@g.us', 'hello'), true);
assert.equal(shouldArchiveGroupMessage(true, 'someone@g.us', 'family dinner'), false);
assert.equal(shouldArchiveGroupMessage(false, '919822304910@s.whatsapp.net', 'hi'), true);

const chosen = pickBestLeadMatch(
  [
    { id: 'closed', phone: '9822304910', status: 'Converted', updated_at: '2026-11-26T10:00:00Z' },
    { id: 'open-old', phone: '9822304910', status: 'Follow-up', updated_at: '2026-01-01T10:00:00Z' },
    { id: 'open-new', phone: '9822304910', status: 'New Inquiry', updated_at: '2026-11-20T10:00:00Z' },
  ],
  '919822304910'
);
assert.equal(chosen?.id, 'open-new');

assert.equal(displayMessageBody('', 'image'), '[image]');
assert.equal(displayMessageBody('plot in Besa', 'image'), '[image] plot in Besa');
assert.equal(isAiAutoReplyEnabled({}), false);
assert.equal(isAiAutoReplyEnabled({ WHATSAPP_AI_AUTO_REPLY: 'true' }), true);

console.log('whatsapp automation unit tests passed');

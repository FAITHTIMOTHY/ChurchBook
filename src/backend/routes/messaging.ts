import { Router, Response } from 'express';
import { collections } from '../db/db.js';
import { AuthenticatedRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Send bulk sms/messages
// Restricted to Pastor and HOD roles
router.post('/send', authMiddleware, requireRole(['Pastor', 'HOD']), (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const { target, unitId, message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message body cannot be empty.' });
  }

  if (!target || !['all', 'unit', 'first-timers'].includes(target)) {
    return res.status(400).json({ error: 'Invalid target. Must be "all", "unit", or "first-timers".' });
  }

  const members = collections.getMembers().filter(m => m.tenant_id === tenantId);
  let recipients: typeof members = [];

  if (target === 'all') {
    // Pastor can broadcast to the entire church
    if (currentUser.role !== 'Pastor') {
      return res.status(403).json({ error: 'Access Denied: Only the Senior Pastor can broadcast messages to the entire church.' });
    }
    recipients = members;
  } else if (target === 'unit') {
    // HODs can broadcast to their own unit; Pastors can broadcast to any unit
    const targetUnitId = currentUser.role === 'Pastor' ? unitId : currentUser.unit_id;
    if (!targetUnitId) {
      return res.status(400).json({ error: 'Please specify a valid department unit target.' });
    }
    recipients = members.filter(m => m.unit_id === targetUnitId);
  } else if (target === 'first-timers') {
    // Pastors and Follow-up HODs can message first-timers/new members
    // Here, we define first-timers as members who joined in the last 30 days and are general members
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    recipients = members.filter(m => 
      m.role === 'Member' && 
      new Date(m.joined_date) >= thirtyDaysAgo
    );
  }

  const recipientNames = recipients.map(r => r.name);
  const recipientCount = recipients.length;

  console.log(`[Broadcast Messaging Service] Tenant: ${tenantId}`);
  console.log(`[Sender]: ${currentUser.name} (${currentUser.position})`);
  console.log(`[Target]: ${target} (Count: ${recipientCount})`);
  console.log(`[Message]: ${message}`);
  console.log(`[Recipients]:`, recipientNames);

  return res.json({
    success: true,
    recipientCount,
    recipients: recipientNames,
    message: `Broadcast message sent successfully to ${recipientCount} contacts.`
  });
});

export default router;

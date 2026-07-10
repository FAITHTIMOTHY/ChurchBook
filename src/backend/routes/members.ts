import { Router, Response } from 'express';
import { collections, saveDB, Member } from '../db/db.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper to prune sensitive member data based on logged-in user's role
function pruneMemberData(member: Member, currentUser: Member): Partial<Member> {
  const isPastor = currentUser.role === 'Pastor';
  const isFollowUp = currentUser.role === 'FollowUp';
  const isSelf = currentUser.id === member.id;
  
  // HOD can see full details of members in their own unit
  const isOwnHOD = currentUser.role === 'HOD' && currentUser.unit_id === member.unit_id && member.unit_id !== null;

  if (isPastor || isFollowUp || isSelf || isOwnHOD) {
    return member; // Full access
  }

  // Restricted access (e.g. Ushers, other Members)
  return {
    id: member.id,
    tenant_id: member.tenant_id,
    name: member.name,
    role: member.role,
    position: member.position,
    unit_id: member.unit_id,
    status: member.status,
    profile_picture_url: member.profile_picture_url,
    // Pruned fields: email, phone, address, dob_month, dob_day, joined_date
  };
}

// 1. Get all members for the active tenant
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const { search, role, status } = req.query;

  let members = collections.getMembers().filter(m => m.tenant_id === tenantId);

  // Apply search filtering
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    members = members.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.email.toLowerCase().includes(q) ||
      m.position.toLowerCase().includes(q)
    );
  }

  // Apply role filtering
  if (role && typeof role === 'string') {
    members = members.filter(m => m.role === role);
  }

  // Apply status filtering
  if (status && typeof status === 'string') {
    members = members.filter(m => m.status === status);
  }

  // Prune sensitive data based on role
  const prunedMembers = members.map(m => pruneMemberData(m, currentUser));

  return res.json(prunedMembers);
});

// 2. Get details of a single member
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const memberId = req.params.id;

  const member = collections.getMembers().find(m => m.id === memberId && m.tenant_id === tenantId);

  if (!member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  return res.json(pruneMemberData(member, currentUser));
});

// 3. Register a new member
// Restricted to Pastors, HODs, or Follow-up staff
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;

  if (currentUser.role !== 'Pastor' && currentUser.role !== 'HOD' && currentUser.role !== 'FollowUp') {
    return res.status(403).json({ error: 'Access Denied: You do not have permissions to register new members.' });
  }

  const { name, email, phone, address, profile_picture_url, dob_month, dob_day, role, position, unit_id } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and Role are required fields.' });
  }

  // Build unique ID
  const newId = `m_${tenantId}_${Date.now()}`;
  const newMember: Member = {
    id: newId,
    tenant_id: tenantId,
    name,
    email: email || '',
    phone: phone || '',
    address: address || '',
    profile_picture_url: profile_picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
    dob_month: Number(dob_month) || 1,
    dob_day: Number(dob_day) || 1,
    role: role,
    position: position || 'General Member',
    unit_id: unit_id || null,
    status: 'Active',
    joined_date: new Date().toISOString(),
  };

  collections.getMembers().push(newMember);
  saveDB();

  return res.status(201).json(newMember);
});

// 4. Update a member profile
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const memberId = req.params.id;

  const members = collections.getMembers();
  const memberIdx = members.findIndex(m => m.id === memberId && m.tenant_id === tenantId);

  if (memberIdx === -1) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  const targetMember = members[memberIdx];

  // Access check: Pastor, HOD of the same unit, or the user updating themselves
  const isPastor = currentUser.role === 'Pastor';
  const isSelf = currentUser.id === memberId;
  const isOwnHOD = currentUser.role === 'HOD' && currentUser.unit_id === targetMember.unit_id && targetMember.unit_id !== null;

  if (!isPastor && !isSelf && !isOwnHOD) {
    return res.status(403).json({ error: 'Access Denied: Insufficient permissions to update this member.' });
  }

  const { name, email, phone, address, profile_picture_url, dob_month, dob_day, role, position, unit_id, status } = req.body;

  // Standard member cannot modify their own role, position, unit, or status
  if (!isPastor && !isOwnHOD) {
    if (role !== undefined && role !== targetMember.role) {
      return res.status(403).json({ error: 'Access Denied: Standard members cannot change roles.' });
    }
    if (position !== undefined && position !== targetMember.position) {
      return res.status(403).json({ error: 'Access Denied: Standard members cannot change positions.' });
    }
    if (unit_id !== undefined && unit_id !== targetMember.unit_id) {
      return res.status(403).json({ error: 'Access Denied: Standard members cannot change departments.' });
    }
    if (status !== undefined && status !== targetMember.status) {
      return res.status(403).json({ error: 'Access Denied: Standard members cannot change status.' });
    }
  }

  // Apply updates
  if (name !== undefined) targetMember.name = name;
  if (email !== undefined) targetMember.email = email;
  if (phone !== undefined) targetMember.phone = phone;
  if (address !== undefined) targetMember.address = address;
  if (profile_picture_url !== undefined) targetMember.profile_picture_url = profile_picture_url;
  if (dob_month !== undefined) targetMember.dob_month = Number(dob_month);
  if (dob_day !== undefined) targetMember.dob_day = Number(dob_day);
  if (role !== undefined) targetMember.role = role;
  if (position !== undefined) targetMember.position = position;
  if (unit_id !== undefined) targetMember.unit_id = unit_id || null;
  if (status !== undefined) targetMember.status = status;

  saveDB();
  return res.json(targetMember);
});

// 5. Delete a member profile (Strictly Senior Pastor)
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const memberId = req.params.id;

  if (currentUser.role !== 'Pastor') {
    return res.status(403).json({ error: 'Access Denied: Only the Senior Pastor can delete member profiles.' });
  }

  const members = collections.getMembers();
  const idx = members.findIndex(m => m.id === memberId && m.tenant_id === tenantId);

  if (idx === -1) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  members.splice(idx, 1);
  saveDB();

  return res.json({ success: true, message: 'Member profile deleted successfully.' });
});

export default router;

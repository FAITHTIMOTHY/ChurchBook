import { Router, Response } from 'express';
import { collections, saveDB, Attendance } from '../db/db.js';
import { AuthenticatedRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// 1. Get attendance sheet for a specific service and date
// Restricted to Ushers and Pastors
router.get('/sheet', authMiddleware, requireRole(['Usher', 'Pastor']), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const serviceDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const serviceName = (req.query.serviceName as string) || 'Sunday Worship';

  const members = collections.getMembers().filter(m => m.tenant_id === tenantId);
  const attendanceRecords = collections.getAttendance().filter(a => 
    a.tenant_id === tenantId && 
    a.service_date === serviceDate && 
    a.service_name === serviceName
  );

  // Map each member to their attendance record for this service
  const sheet = members.map(m => {
    const record = attendanceRecords.find(r => r.member_id === m.id);
    return {
      memberId: m.id,
      memberName: m.name,
      role: m.role,
      position: m.position,
      status: record ? record.status : 'Absent', // default to absent if not marked
      isMarked: !!record,
    };
  });

  return res.json({
    serviceDate,
    serviceName,
    sheet,
  });
});

// 2. Mark attendance (Tick present/absent) for a specific member
// Restricted to Ushers and Pastors
router.post('/mark', authMiddleware, requireRole(['Usher', 'Pastor']), (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const { memberId, serviceDate, serviceName, status } = req.body;

  if (!memberId || !status || !serviceName || !serviceDate) {
    return res.status(400).json({ error: 'Missing parameters: memberId, serviceDate, serviceName, status.' });
  }

  const member = collections.getMembers().find(m => m.id === memberId && m.tenant_id === tenantId);
  if (!member) {
    return res.status(404).json({ error: 'Member not found under active tenant.' });
  }

  const attendance = collections.getAttendance();
  const existingRecordIdx = attendance.findIndex(a => 
    a.tenant_id === tenantId && 
    a.member_id === memberId && 
    a.service_date === serviceDate && 
    a.service_name === serviceName
  );

  if (existingRecordIdx !== -1) {
    // Update existing record
    attendance[existingRecordIdx].status = status;
    attendance[existingRecordIdx].recorded_by = currentUser.id;
    attendance[existingRecordIdx].recorded_at = new Date().toISOString();
  } else {
    // Create new record
    const newRecord: Attendance = {
      id: `att_${tenantId}_${Date.now()}`,
      tenant_id: tenantId,
      member_id: memberId,
      service_date: serviceDate,
      service_name: serviceName,
      status,
      recorded_by: currentUser.id,
      recorded_at: new Date().toISOString(),
    };
    attendance.push(newRecord);
  }

  saveDB();
  return res.json({ success: true, message: 'Attendance status recorded.' });
});

// 3. Close service attendance (Auto-tick absent for everyone unmarked)
// Restricted to Ushers and Pastors
router.post('/close-service', authMiddleware, requireRole(['Usher', 'Pastor']), (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const tenantId = req.tenantId!;
  const { serviceDate, serviceName } = req.body;

  if (!serviceDate || !serviceName) {
    return res.status(400).json({ error: 'serviceDate and serviceName are required.' });
  }

  const members = collections.getMembers().filter(m => m.tenant_id === tenantId);
  const attendance = collections.getAttendance();

  let autoMarkedCount = 0;

  for (const m of members) {
    const hasRecord = attendance.some(a => 
      a.tenant_id === tenantId && 
      a.member_id === m.id && 
      a.service_date === serviceDate && 
      a.service_name === serviceName
    );

    // If member has no attendance record logged for this service, automatically mark them as Absent
    if (!hasRecord) {
      const autoRecord: Attendance = {
        id: `att_auto_${tenantId}_${Date.now()}_${m.id.substring(0,6)}`,
        tenant_id: tenantId,
        member_id: m.id,
        service_date: serviceDate,
        service_name: serviceName,
        status: 'Absent',
        recorded_by: currentUser.id,
        recorded_at: new Date().toISOString(),
      };
      attendance.push(autoRecord);
      autoMarkedCount++;
    }
  }

  if (autoMarkedCount > 0) {
    saveDB();
  }

  return res.json({
    success: true,
    message: `Attendance checklist closed. ${autoMarkedCount} unmarked members automatically ticked Absent.`
  });
});

// 4. Get attendance performance statistics
// Restricted to Pastors, HODs, and Follow-up teams
router.get('/stats', authMiddleware, requireRole(['Pastor', 'HOD', 'FollowUp']), (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { type } = req.query; // 'all' or 'workers'

  const members = collections.getMembers().filter(m => {
    if (m.tenant_id !== tenantId) return false;
    if (type === 'workers') {
      return m.role !== 'Member'; // Workers are Pastor, HOD, Usher, FollowUp
    }
    return true;
  });

  const attendance = collections.getAttendance().filter(a => a.tenant_id === tenantId);

  // Calculate statistics per member
  const memberPerformance = members.map(m => {
    const records = attendance.filter(a => a.member_id === m.id);
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    return {
      id: m.id,
      name: m.name,
      role: m.role,
      position: m.position,
      totalServices: total,
      presentCount: present,
      attendanceRate: rate,
    };
  });

  // Calculate global average rate
  const totalRates = memberPerformance.reduce((sum, item) => sum + item.attendanceRate, 0);
  const avgAttendanceRate = memberPerformance.length > 0 ? Math.round(totalRates / memberPerformance.length) : 0;

  return res.json({
    avgAttendanceRate,
    memberPerformance,
  });
});

export default router;

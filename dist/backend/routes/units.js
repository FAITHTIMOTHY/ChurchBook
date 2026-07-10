import { Router } from 'express';
import { collections, saveDB } from '../db/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
const router = Router();
// 1. Get all units for the active tenant
router.get('/', authMiddleware, (req, res) => {
    const tenantId = req.tenantId;
    const units = collections.getUnits().filter(u => u.tenant_id === tenantId);
    return res.json(units);
});
// 2. Create new unit (Pastor creates units, HOD can create sub-units)
router.post('/', authMiddleware, requireRole(['Pastor', 'HOD']), (req, res) => {
    const currentUser = req.user;
    const tenantId = req.tenantId;
    const { name, parent_unit_id, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Department name is required.' });
    }
    // If HOD is creating a unit, verify it is a subunit under their department
    if (currentUser.role === 'HOD') {
        if (!parent_unit_id || parent_unit_id !== currentUser.unit_id) {
            return res.status(403).json({
                error: 'Access Denied: HODs can only create sub-units nested under their own department.'
            });
        }
    }
    const units = collections.getUnits();
    const duplicate = units.some(u => u.tenant_id === tenantId && u.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        return res.status(400).json({ error: `A unit named "${name}" already exists in this church.` });
    }
    const newUnit = {
        id: `unit_${tenantId}_${Date.now()}`,
        tenant_id: tenantId,
        name,
        parent_unit_id: parent_unit_id || null,
        description: description || '',
    };
    units.push(newUnit);
    saveDB();
    return res.status(201).json(newUnit);
});
// 3. Delete unit (Strictly Senior Pastor)
router.delete('/:id', authMiddleware, requireRole(['Pastor']), (req, res) => {
    const tenantId = req.tenantId;
    const unitId = req.params.id;
    const units = collections.getUnits();
    const idx = units.findIndex(u => u.id === unitId && u.tenant_id === tenantId);
    if (idx === -1) {
        return res.status(404).json({ error: 'Department unit not found.' });
    }
    // Remove unit association from members and inventory items
    const members = collections.getMembers();
    members.forEach(m => {
        if (m.unit_id === unitId)
            m.unit_id = null;
    });
    const inventory = collections.getInventory();
    inventory.forEach(i => {
        if (i.unit_id === unitId)
            i.unit_id = null;
    });
    units.splice(idx, 1);
    saveDB();
    return res.json({ success: true, message: 'Department unit and its cascading associations deleted.' });
});
export default router;

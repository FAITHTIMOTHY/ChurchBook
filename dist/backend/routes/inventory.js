import { Router } from 'express';
import { collections, saveDB } from '../db/db.js';
import { authMiddleware, requireUnitOrPastor } from '../middleware/auth.js';
const router = Router();
// 1. Get all inventory items for the active tenant
// Accessible by any authenticated member to view what equipments are in church
router.get('/', authMiddleware, (req, res) => {
    const tenantId = req.tenantId;
    const inventory = collections.getInventory().filter(i => i.tenant_id === tenantId);
    return res.json(inventory);
});
// 2. Create new inventory item
// Restricted to members of Technical, Sanctuary, or Music departments, and the Pastor
router.post('/', authMiddleware, requireUnitOrPastor(['tech', 'sanctuary', 'music', 'choir', 'instrument']), (req, res) => {
    const tenantId = req.tenantId;
    const { item_name, description, status, unit_id } = req.body;
    if (!item_name || !status) {
        return res.status(400).json({ error: 'Item name and status are required.' });
    }
    const newItem = {
        id: `inv_${tenantId}_${Date.now()}`,
        tenant_id: tenantId,
        item_name,
        description: description || '',
        status: status || 'Active',
        unit_id: unit_id || null,
        updated_at: new Date().toISOString(),
    };
    collections.getInventory().push(newItem);
    saveDB();
    return res.status(201).json(newItem);
});
// 3. Update inventory item status or details
// Restricted to members of Technical, Sanctuary, or Music departments, and the Pastor
router.put('/:id', authMiddleware, requireUnitOrPastor(['tech', 'sanctuary', 'music', 'choir', 'instrument']), (req, res) => {
    const tenantId = req.tenantId;
    const itemId = req.params.id;
    const { item_name, description, status, unit_id } = req.body;
    const inventory = collections.getInventory();
    const itemIdx = inventory.findIndex(i => i.id === itemId && i.tenant_id === tenantId);
    if (itemIdx === -1) {
        return res.status(404).json({ error: 'Inventory item not found.' });
    }
    const item = inventory[itemIdx];
    if (item_name !== undefined)
        item.item_name = item_name;
    if (description !== undefined)
        item.description = description;
    if (status !== undefined) {
        if (!['Active', 'Faulty', 'Unavailable'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value. Must be Active, Faulty, or Unavailable.' });
        }
        item.status = status;
    }
    if (unit_id !== undefined)
        item.unit_id = unit_id || null;
    item.updated_at = new Date().toISOString();
    saveDB();
    return res.json(item);
});
// 4. Delete inventory item
// Restricted to Pastor only for safety
router.delete('/:id', authMiddleware, (req, res) => {
    const currentUser = req.user;
    const tenantId = req.tenantId;
    const itemId = req.params.id;
    if (currentUser.role !== 'Pastor') {
        return res.status(403).json({ error: 'Access Denied: Only the Senior Pastor can delete items from the registry.' });
    }
    const inventory = collections.getInventory();
    const idx = inventory.findIndex(i => i.id === itemId && i.tenant_id === tenantId);
    if (idx === -1) {
        return res.status(404).json({ error: 'Inventory item not found.' });
    }
    inventory.splice(idx, 1);
    saveDB();
    return res.json({ success: true, message: 'Inventory item deleted successfully.' });
});
export default router;

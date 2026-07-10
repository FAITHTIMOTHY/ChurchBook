import { collections } from '../db/db.js';
export function tenantMiddleware(req, res, next) {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({
            error: 'Tenant ID is required. Please set the "X-Tenant-ID" header.'
        });
    }
    const tenants = collections.getTenants();
    const matchedTenant = tenants.find(t => t.id === tenantId);
    if (!matchedTenant) {
        return res.status(404).json({
            error: `Tenant "${tenantId}" is unrecognized or not registered on this server.`
        });
    }
    req.tenantId = matchedTenant.id;
    req.tenantName = matchedTenant.name;
    next();
}

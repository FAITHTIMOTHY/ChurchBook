import { Response, NextFunction } from 'express';
import { collections, Member } from '../db/db.js';
import { TenantRequest } from './tenant.js';

export interface AuthenticatedRequest extends TenantRequest {
  user?: Member;
}

// Authenticates the request user and ensures they belong to the current active tenant
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] || req.query.userId;
  const tenantId = req.tenantId;

  if (!userId || typeof userId !== 'string') {
    return res.status(401).json({
      error: 'Authentication required. Please set the "X-User-ID" header.'
    });
  }

  const members = collections.getMembers();
  const matchedUser = members.find(m => m.id === userId && m.tenant_id === tenantId);

  if (!matchedUser) {
    return res.status(401).json({
      error: 'Invalid session. User does not exist under the active tenant.'
    });
  }

  req.user = matchedUser;
  next();
}

// Restricts routes to specific roles (e.g. Pastor, HOD)
export function requireRole(allowedRoles: Member['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Role "${req.user.role}" does not have privileges for this action.`
      });
    }

    next();
  };
}

// Restricts route to a set of department/unit names, but permits the Senior Pastor to bypass
export function requireUnitOrPastor(allowedUnitKeywords: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Senior Pastor has absolute control over all areas of the application
    if (req.user.role === 'Pastor') {
      return next();
    }

    // Check if the user has an associated unit
    if (!req.user.unit_id) {
      return res.status(403).json({
        error: 'Access Denied: You do not belong to a department responsible for this operation.'
      });
    }

    // Load unit details
    const units = collections.getUnits();
    const userUnit = units.find(u => u.id === req.user?.unit_id);

    if (!userUnit) {
      return res.status(403).json({ error: 'Access Denied: Associated department not found.' });
    }

    // Verify if unit name contains any of the allowed keywords (e.g. "tech", "usher", "follow")
    const unitNameLower = userUnit.name.toLowerCase();
    const isAuthorized = allowedUnitKeywords.some(keyword => unitNameLower.includes(keyword.toLowerCase()));

    if (!isAuthorized) {
      return res.status(403).json({
        error: `Access Denied: Features of unit "${userUnit.name}" do not include permissions for this task.`
      });
    }

    next();
  };
}

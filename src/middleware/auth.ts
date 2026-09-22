import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Non autorisé: Token manquant' });
  }

  // Handle Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    // Special check for app passkey auth (backward-compatible or teacher/admin passkey)
    if (token === 'admin-secret-passkey' || token.startsWith('prof-')) {
      return next();
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      return next();
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return res.status(401).json({ error: 'Non autorisé: Token invalide' });
    }
  }

  return res.status(401).json({ error: 'Non autorisé: Format de token invalide' });
};

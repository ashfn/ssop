import { Request, Response } from 'express';
import { Provider } from 'oidc-provider';
import { AuthService } from '../services/auth';

export interface SessionUser {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  profile_photo_url?: string;
}

export async function getCurrentUser(req: Request, res: Response, provider: Provider, authService: AuthService): Promise<SessionUser | null> {
  try {
    const ctx = provider.app.createContext(req, res);
    const session = await provider.Session.get(ctx);
    
    if (!session || !session.accountId) {
      return null;
    }

    const user = await authService.findAccountById(session.accountId);
    if (!user) {
      return null;
    }
    
    return {
      sub: user.username,
      username: user.username,
      email: user.email,
      roles: user.roles,
      profile_photo_url: user.profile_photo_url
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function createLoginUrl(provider: Provider, returnTo?: string): Promise<string> {

  const params = new URLSearchParams({
    client_id: 'internal-client',
    redirect_uri: returnTo || '/',
    response_type: 'code',
    scope: 'openid profile email roles',
    state: 'login-redirect'
  });
  
  return `/auth?${params.toString()}`;
} 
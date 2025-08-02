import express, { Router } from 'express';
import { Provider } from 'oidc-provider';
import { AuthService } from '../services/auth';
import { renderLogin, renderDashboard, renderError } from '../utils/render';
import { getCurrentUser } from '../utils/session';
import { ISSUER } from 'src';

export function createHomeRoutes(authService: AuthService, provider: Provider): Router {
  const router = Router();


  router.use(express.urlencoded({ extended: true }));

  router.get('/', async (req, res) => {
    try {
      const user = await getCurrentUser(req, res, provider, authService);
      
      if (user) {
        const html = await renderDashboard(user);
        res.send(html);
      } else {
        const params = new URLSearchParams({
          client_id: 'internal-client',
          redirect_uri: `${ISSUER}/`,
          response_type: 'code',
          scope: 'openid profile email roles',
          state: 'home-login'
        });
        res.redirect(`/auth?${params.toString()}`);
      }
    } catch (error) {
      console.error('Home page error:', error);
      const html = await renderError('Failed to load home page');
      res.send(html);
    }
  });

  router.post('/login', (req, res) => {
    res.redirect('/');
  });

  router.get('/dashboard', (req, res) => {
    res.redirect('/');
  });

  router.get('/user/:username', (req, res) => {
    res.redirect('/dashboard');
  });

  router.post('/logout', async (req, res) => {
    try {
      const ctx = provider.app.createContext(req, res);
      const session = await provider.Session.get(ctx);
      
      if (session) {
        await session.destroy();
      }
      
      res.clearCookie('_session');
      res.clearCookie('_session.sig');
      
      res.redirect('/');
    } catch (error) {
      console.error('Logout error:', error);
      res.redirect('/');
    }
  });

  router.get('/error', async (req, res) => {
    const message = req.query.message as string || 'An unexpected error occurred';
    const details = req.query.details as string;
    const html = await renderError(message, details);
    res.send(html);
  });

  return router;
} 
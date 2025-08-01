import express, { Router } from 'express';
import { Provider, InteractionResults } from 'oidc-provider';
import { AuthService } from '../services/auth';
import { renderLogin, renderConsent, renderError, renderLoginTotp } from '../utils/render';

export function createInteractionRoutes(provider: Provider, authService: AuthService): Router {
  const router = Router();

  router.use(express.urlencoded({ extended: true }));

  router.get('/interaction/:uid', async (req, res) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { uid, prompt, params } = details;
      
      if (prompt.name === 'login') {
        const error = req.query.error === '1';
        const html = await renderLogin(`/interaction/${uid}/login`, error, uid);
        res.send(html);
        return;
      }
      
      if (prompt.name === 'consent') {
        const html = await renderConsent(uid, params);
        res.send(html);
        return;
      }
      
      const html = await renderError(`Unsupported prompt: ${prompt.name}`);
      res.status(500).send(html);
    } catch (error) {
      console.error('Interaction error:', error);
      const html = await renderError('Error processing interaction');
      res.status(500).send(html);
    }
  });

  router.post('/interaction/:uid/login', async (req, res) => {
    try {
      const { uid } = req.params;
      const { username, password, totp_code } = req.body;
      const user = await authService.authenticateUser(username, password, totp_code);
      
      if (user && (user as any).requiresTotp) {
        const html = await renderLoginTotp(
          `/interaction/${uid}/login`,
          username,
          password,
          false,
          uid,
          `/interaction/${uid}`
        );
        res.send(html);
        return;
      }
      
      if (user && !(user as any).requiresTotp) {
        const result: InteractionResults = {
          login: {
            accountId: user.username,
          },
        };

        await provider.interactionFinished(req, res, result);
      } else {
        if (totp_code) {
          const html = await renderLoginTotp(
            `/interaction/${uid}/login`,
            username,
            password,
            true,
            uid,
            `/interaction/${uid}`
          );
          res.send(html);
        } else {
          res.redirect(`/interaction/${uid}?error=1`);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      res.redirect(`/interaction/${req.params.uid}?error=1`);
    }
  });


  router.post('/interaction/:uid/consent', async (req, res) => {
    try {
      const { consent } = req.body;
      
      
      if (consent === 'accept') {
        const details = await provider.interactionDetails(req, res);
        
        const scope = details.params.scope as string;
        const requestedScopes = scope ? scope.split(' ') : ['openid'];
        
        const Grant = provider.Grant;
        const grant = new Grant({
          clientId: details.params.client_id as string,
          accountId: details.session?.accountId,
        });
        
        requestedScopes.forEach(scope => {
          if (['openid', 'profile', 'email', 'roles'].includes(scope)) {
            grant.addOIDCScope(scope);
          }
        });
        
        await grant.save();
        
        const result: InteractionResults = {
          consent: {
            grantId: grant.jti,
          },
        };
        
        console.log('Finishing consent interaction with result:', result);
        await provider.interactionFinished(req, res, result);
      } else {
        const html = await renderError('Access denied', 'The user denied access to the application.');
        res.status(400).send(html);
      }
    } catch (error) {
      console.error('Consent error:', error);
      const html = await renderError('Error processing consent');
      res.status(500).send(html);
    }
  });

  return router;
} 
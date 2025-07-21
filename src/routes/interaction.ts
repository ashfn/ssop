import express, { Router } from 'express';
import { Provider, InteractionResults } from 'oidc-provider';
import { AuthService } from '../services/auth';
import { renderLogin, renderConsent, renderError, renderLoginTotp } from '../utils/render';

export function createInteractionRoutes(provider: Provider, authService: AuthService): Router {
  const router = Router();

  // Parse form data
  router.use(express.urlencoded({ extended: true }));

  // GET /interaction/:uid - Show interaction page
  router.get('/interaction/:uid', async (req, res) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { uid, prompt, params } = details;
      
      console.log('Interaction details:', {
        uid,
        promptName: prompt.name,
        promptReasons: prompt.reasons,
        params: params,
        session: details.session?.accountId
      });
      
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

  // POST /interaction/:uid/login - Handle login submission
  router.post('/interaction/:uid/login', async (req, res) => {
    try {
      const { uid } = req.params;
      const { username, password, totp_code } = req.body;

      console.log('Login attempt for user:', username, totp_code ? 'with TOTP' : 'password only');
      
      const user = await authService.authenticateUser(username, password, totp_code);
      
      // Check if user exists but requires TOTP
      if (user && (user as any).requiresTotp) {
        console.log('User requires TOTP verification');
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
        console.log('User authenticated successfully:', user.username);
        
        const result: InteractionResults = {
          login: {
            accountId: user.username,
          },
        };

        console.log('Setting interaction result:', result);
        await provider.interactionFinished(req, res, result);
      } else {
        console.log('Authentication failed for user:', username);
        if (totp_code) {
          // TOTP was provided but failed
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

  // POST /interaction/:uid/consent - Handle consent submission
  router.post('/interaction/:uid/consent', async (req, res) => {
    try {
      const { consent } = req.body;
      
      console.log('Consent submitted:', consent);
      
      if (consent === 'accept') {
        const details = await provider.interactionDetails(req, res);
        console.log('Consent interaction details:', {
          uid: details.uid,
          prompt: details.prompt,
          params: details.params,
          grantId: details.grantId
        });
        
        // Parse the requested scopes and grant them
        const scope = details.params.scope as string;
        const requestedScopes = scope ? scope.split(' ') : ['openid'];
        
        console.log('Granting scopes:', requestedScopes);
        
        // Create a new grant and approve the scopes
        const Grant = provider.Grant;
        const grant = new Grant({
          clientId: details.params.client_id as string,
          accountId: details.session?.accountId,
        });
        
        // Add the requested scopes to the grant
        requestedScopes.forEach(scope => {
          if (['openid', 'profile', 'email', 'roles'].includes(scope)) {
            grant.addOIDCScope(scope);
          }
        });
        
        // Save the grant and use it in the result
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
      try {
        const details = await provider.interactionDetails(req, res);
        console.error('Interaction details on error:', details);
      } catch (detailsError) {
        console.error('Failed to get interaction details:', detailsError);
      }
      const html = await renderError('Error processing consent');
      res.status(500).send(html);
    }
  });

  return router;
} 
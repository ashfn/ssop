import { Provider, Configuration, ClientMetadata } from 'oidc-provider';
import { AuthService } from '../services/auth';
import { Config } from '../types';
import MemoryAdapter from './adapter';

export function createProvider(issuer: string, config: Config, authService: AuthService): Provider {
  const internalClient: ClientMetadata = {
    client_id: 'internal-client',
    client_secret: 'internal-secret',
    redirect_uris: ['http://localhost:3000/', 'http://localhost:3000/dashboard'],
    post_logout_redirect_uris: ['http://localhost:3000/'],
    response_types: ['code'],
    grant_types: ['authorization_code'],
    token_endpoint_auth_method: 'client_secret_post',
  };

  const externalClients: ClientMetadata[] = config.clients.map(client => ({
    client_id: client.client_id,
    client_secret: client.client_secret,
    redirect_uris: client.redirect_uris,
    post_logout_redirect_uris: client.redirect_uris, // Use same URIs for logout
    response_types: ['code'],
    grant_types: ['authorization_code'],
    token_endpoint_auth_method: 'client_secret_post', // Allow both POST and basic auth
  }));

  const configuration: Configuration = {
    // Disable all internal logging for clean production output
    renderError: async (ctx, out, error) => {
      // Custom error handler to avoid internal logging
      ctx.type = 'html';
      ctx.body = `<html><body><h1>OIDC Error</h1><p>An error occurred during authentication.</p></body></html>`;
    },

    async findAccount(ctx, id) {
      const user = await authService.findAccountById(id);
      if (!user) {
        return undefined;
      }

      return {
        accountId: user.username,
        async claims(use, scope) {
          const claims: any = {
            sub: user.username,
            preferred_username: user.username,
          };

          if (scope.includes('email')) {
            claims.email = user.email;
            claims.email_verified = true;
          }

          if (scope.includes('profile')) {
            claims.name = user.username;
            claims.preferred_username = user.username;
            if (user.profile_photo_url) {
              claims.picture = user.profile_photo_url;
            }
          }

          if (scope.includes('roles')) {
            claims.roles = user.roles;
          }

          return claims;
        },
      };
    },
    
    clients: [internalClient, ...externalClients],

    scopes: ['openid', 'profile', 'email', 'roles'],
    
    claims: {
      openid: ['sub'],
      profile: ['name', 'preferred_username', 'picture'],
      email: ['email', 'email_verified'],
      roles: ['roles'],
    },

    features: {
      devInteractions: { enabled: false }
    },
    
    // Add explicit client authentication methods
    clientAuthMethods: ['client_secret_basic', 'client_secret_post'],

    interactions: {
      url(ctx, interaction) {
        return `/interaction/${interaction.uid}`;
      },
    },

    // Auto-approve all scopes for internal applications
    async loadExistingGrant(ctx) {
      if (!ctx.oidc.client) return undefined;
      
      const grantId = (ctx.oidc.result && ctx.oidc.result.consent && ctx.oidc.result.consent.grantId) || ctx.oidc.session?.grantIdFor(ctx.oidc.client.clientId);
      
      if (grantId) {
        return ctx.oidc.provider.Grant.find(grantId);
      }

      const grant = new ctx.oidc.provider.Grant({
        clientId: ctx.oidc.client.clientId,
        accountId: ctx.oidc.session?.accountId,
      });

      // Add all requested scopes
      if (ctx.oidc.params && typeof ctx.oidc.params.scope === 'string') {
        const scopes = ctx.oidc.params.scope.split(' ');
        scopes.forEach(scope => {
          if (scope !== 'openid') {
            grant.addOIDCScope(scope);
          }
        });
        grant.addOIDCScope('openid');
      }

      // Add all requested claims
      grant.addOIDCClaims(['sub', 'name', 'preferred_username', 'email', 'email_verified', 'picture', 'roles']);

      await grant.save();
      
      return grant;
    },

    cookies: {
      keys: [process.env.COOKIE_SECRET || 'default-secret-please-change'],
    },

    adapter: MemoryAdapter,

    pkce: {
      required: () => false,
    },
    
    // Ensure proper token endpoint configuration
    conformIdTokenClaims: false,

    // Extend session and grant TTLs for better user experience
    ttl: {
      Session: 86400, // 24 hours
      Grant: 86400, // 24 hours
      AccessToken: 3600, // 1 hour
      AuthorizationCode: 600, // 10 minutes
      RefreshToken: 86400 * 7, // 7 days
      IdToken: 3600, // 1 hour
    },
  };

  return new Provider(issuer, configuration);
} 
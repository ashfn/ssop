import { Provider, Configuration, ClientMetadata } from 'oidc-provider';
import { AuthService } from '../services/auth';
import { Config } from '../types';
import MemoryAdapter from './adapter';
import { randomBytes } from 'crypto';

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
    post_logout_redirect_uris: client.redirect_uris,
    response_types: ['code'],
    grant_types: ['authorization_code'],
    token_endpoint_auth_method: 'client_secret_post',
  }));

  const configuration: Configuration = {
    renderError: async (ctx, out, error) => {
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

      if (ctx.oidc.params && typeof ctx.oidc.params.scope === 'string') {
        const scopes = ctx.oidc.params.scope.split(' ');
        scopes.forEach(scope => {
          if (scope !== 'openid') {
            grant.addOIDCScope(scope);
          }
        });
        grant.addOIDCScope('openid');
      }

      grant.addOIDCClaims(['sub', 'name', 'preferred_username', 'email', 'email_verified', 'picture', 'roles']);

      await grant.save();
      
      return grant;
    },



    cookies: {
      keys: [randomBytes(32).toString('hex')],
    },

    adapter: MemoryAdapter,

    pkce: {
      required: () => false,
    },
    
    conformIdTokenClaims: false,

    ttl: {
      Session: 86400,
      Grant: 86400,
      AccessToken: 3600,
      AuthorizationCode: 600,
      RefreshToken: 86400 * 7,
      IdToken: 3600,
    },
  };

  return new Provider(issuer, configuration);
} 
# SSOP - Super Simple OIDC Provider

A basic OpenID Connect provider implementation using Node.js and TypeScript with optional TOTP support.

## Security Disclaimer

**This software is provided as-is without any security guarantees. It was created for personal use with internal applications. Use at your own risk and thoroughly review the code before deploying in any security-sensitive environment.**

## Features

- OpenID Connect authorization server
- Optional TOTP two-factor authentication  
- JSON file-based user and client management
- Docker deployment support

## Setup

### Docker

```bash
git clone <your-repo>
cd ssop
docker-compose up -d
```

Access at http://localhost:3000

### Local Development

```bash
npm install
npm run create-user
npm run dev
```

## Configuration

### Users

Run `npm run create-user` to generate user JSON, then add to `users.json`. 
The user creation tool will generate a QR code for authenticator apps.
```json
{
  "username": "admin",
  "password_hash": "$2b$10$...",
  "email": "admin@example.com",
  "roles": ["admin"],
  "totp_secret": "...",
  "totp_enabled": true
}
```

### Clients

Edit `clients.json`:

```json
[
  {
    "client_id": "your-app",
    "client_secret": "your-secret", 
    "redirect_uris": ["https://your-app.com/callback"]
  }
]
```

## Docker Deployment

```bash
docker-compose up -d
```

Or using the pre-built image from GitHub Container Registry:

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/users.json:/app/users.json:ro \
  -v $(pwd)/clients.json:/app/clients.json:ro \
  -e ISSUER=http://localhost:3000 \
  -e COOKIE_SECRET=your-secure-random-secret \
  ghcr.io/yourusername/ssop:latest
```

## Environment Variables

- `PORT` (default: 3000)
- `ISSUER` (default: http://localhost:3000)
- `NODE_ENV`
- `COOKIE_SECRET` - Secret for cookie signing (defaults to insecure fallback)

## Endpoints

- `/.well-known/openid-configuration` - Discovery
- `/auth` - Authorization
- `/token` - Token exchange
- `/userinfo` - User information
- `/session/end` - Logout
- `/` - Dashboard
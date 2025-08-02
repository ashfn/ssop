import express from 'express';
import cors from 'cors';
import { loadConfig } from './config/loader';
import { AuthService } from './services/auth';
import { createProvider } from './config/provider';
import { createInteractionRoutes } from './routes/interaction';
import { createHomeRoutes } from './routes/home';

const PORT = process.env.PORT || 3000;
export const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;

async function startServer() {
  const config = loadConfig();
  
  const authService = new AuthService(config);
  

  const MemoryAdapter = (await import('./config/adapter')).default;
  MemoryAdapter.connect();
  

  const provider = createProvider(ISSUER, config, authService);

  const app = express();
  
  app.set('trust proxy', true);


  app.use(cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200
  }));
  
  app.use(createHomeRoutes(authService, provider));
  
  app.use(createInteractionRoutes(provider, authService));


  app.use('/', provider.callback());
  
  app.listen(PORT, () => {
    console.log(`
                      
                      
  ___ ___  ___  _ __  
 / __/ __|/ _ \\| '_ \\ 
 \\__ \\__ \\ (_) | |_) |
 |___/___/\\___/| .__/ 
               | |    
               |_|    

 Super Simple OIDC Provider
═══════════════════════════════════════
Server:    http://localhost:${PORT}
Loaded:    ${config.users.length} users, ${config.clients.length} clients
═══════════════════════════════════════`);
  });
}

startServer().catch(error => {
  console.error('ERROR: Failed to start server -', error.message);
  process.exit(1);
}); 
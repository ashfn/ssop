import fs from 'fs';
import path from 'path';
import { Config } from '../types';

export function loadConfig(): Config {
  try {
    const usersPath = path.join(process.cwd(), 'users.json');
    const clientsPath = path.join(process.cwd(), 'clients.json');
    
    if (!fs.existsSync(usersPath)) {
      throw new Error('users.json file not found');
    }
    
    if (!fs.existsSync(clientsPath)) {
      throw new Error('clients.json file not found');
    }
    
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
    
    if (!Array.isArray(users)) {
      throw new Error('users.json must contain an array');
    }
    
    if (!Array.isArray(clients)) {
      throw new Error('clients.json must contain an array');
    }
    
    for (const user of users) {
      if (!user.username || !user.password_hash || !user.email) {
        throw new Error(`Invalid user: ${JSON.stringify(user)}`);
      }
    }
    
    for (const client of clients) {
      if (!client.client_id || !client.client_secret || !client.redirect_uris) {
        throw new Error(`Invalid client: ${JSON.stringify(client)}`);
      }
    }
    
    return { users, clients };
  } catch (error: any) {
    console.error('Configuration error:', error.message);
    process.exit(1);
  }
} 
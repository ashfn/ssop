export interface User {
  username: string;
  password_hash: string;
  email: string;
  roles: string[];
  profile_photo_url?: string;
  totp_secret?: string;
  totp_enabled?: boolean;
}

export interface Client {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  scopes: string[];
}

export interface Config {
  users: User[];
  clients: Client[];
}

export interface InteractionDetails {
  uid: string;
  prompt: {
    name: 'login' | 'consent';
    reasons?: string[];
    details?: any;
  };
  params: any;
  session?: any;
  grantId?: string;
}

export interface InteractionResult {
  login?: {
    accountId: string;
  };
  consent?: {
    grantId?: string;
  };
} 
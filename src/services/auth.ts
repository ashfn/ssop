import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { User, Config } from '../types';

export class AuthService {
  constructor(private config: Config) {}

  async findUser(username: string): Promise<User | undefined> {
    return this.config.users.find(user => user.username === username);
  }

  async authenticateUser(username: string, password: string, totpCode?: string): Promise<User | null> {
    const user = await this.findUser(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    if (user.totp_enabled && user.totp_secret) {
      if (!totpCode) {
        return { ...user, requiresTotp: true } as any;
      }

      const isValidTotp = authenticator.verify({
        token: totpCode.replace(/\s/g, ''),
        secret: user.totp_secret
      });

      if (!isValidTotp) {
        return null;
      }
    }

    return user;
  }

  verifyTotpCode(user: User, code: string): boolean {
    if (!user.totp_enabled || !user.totp_secret) {
      return false;
    }

    return authenticator.verify({
      token: code.replace(/\s/g, ''),
      secret: user.totp_secret
    });
  }

  async findAccountById(id: string): Promise<User | undefined> {
    return this.findUser(id);
  }
} 
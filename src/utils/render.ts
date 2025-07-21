import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.join(__dirname, '../views/templates');

export async function renderTemplate(template: string, data: any = {}): Promise<string> {
  const templatePath = path.join(templateDir, `${template}.ejs`);
  const body = await ejs.renderFile(templatePath, data);
  
  return ejs.renderFile(path.join(templateDir, 'layout.ejs'), {
    title: data.title || 'SSOP',
    body
  });
}

export function renderLogin(actionUrl: string, error: boolean = false, uid?: string): Promise<string> {
  return renderTemplate('login', {
    title: 'Sign In - SSOP',
    actionUrl,
    error,
    uid
  });
}

export function renderConsent(uid: string, params: any): Promise<string> {
  return renderTemplate('consent', {
    title: 'Authorize Application - SSOP',
    uid,
    params
  });
}

export function renderDashboard(user: any): Promise<string> {
  return renderTemplate('dashboard', {
    title: `SSOP - ${user.username}`,
    user
  });
}

export function renderError(message: string, details?: string): Promise<string> {
  return renderTemplate('error', {
    title: 'Error - SSOP',
    message,
    details
  });
}

export function renderLoginTotp(actionUrl: string, username: string, password: string, error: boolean = false, uid?: string, backUrl: string = '/'): Promise<string> {
  return renderTemplate('login-totp', {
    title: 'Two-Factor Authentication - SSOP',
    actionUrl,
    username,
    password,
    error,
    uid,
    backUrl
  });
} 
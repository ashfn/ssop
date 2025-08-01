import inquirer from 'inquirer';
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import qrcode from 'qrcode-terminal';
import { User } from '../src/types';

interface UserInput {
  username: string;
  password: string;
  email: string;
  roles: string;
  profile_photo_url?: string;
  enable_totp: boolean;
}

async function createUser(): Promise<void> {
  console.log('SSOP User Generator\n');

  try {
    const answers = await inquirer.prompt<UserInput>([
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        validate: (input: string) => input.trim() ? true : 'Username is required'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: (input: string) => {
          if (input.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(input)) return 'Password must contain at least one uppercase letter';
          if (!/[a-z]/.test(input)) return 'Password must contain at least one lowercase letter';
          if (!/\d/.test(input)) return 'Password must contain at least one number';
          return true;
        }
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: (input: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) ? true : 'Please enter a valid email';
        }
      },
      {
        type: 'input',
        name: 'roles',
        message: 'Roles (comma-separated):',
        default: 'user',
        filter: (input: string) => input.trim()
      },
      {
        type: 'input',
        name: 'profile_photo_url',
        message: 'Profile photo URL (optional):',
        filter: (input: string) => input.trim() || undefined
      },
      {
        type: 'confirm',
        name: 'enable_totp',
        message: 'Enable TOTP (Two-Factor Authentication)?',
        default: false
      }
    ]);


    const password_hash = await bcrypt.hash(answers.password, 10);


    const roles = answers.roles.split(',').map(role => role.trim()).filter(role => role);


    const user: User = {
      username: answers.username,
      password_hash,
      email: answers.email,
      roles,
      profile_photo_url: answers.profile_photo_url
    };


    if (answers.enable_totp) {
      const secret = authenticator.generateSecret();
      const issuer = 'SSOP';
      const accountName = `${answers.username}@${issuer}`;
      
      const totpUrl = authenticator.keyuri(accountName, issuer, secret);
      
      user.totp_secret = secret;
      user.totp_enabled = true;

      console.log('TOTP Setup Required:');
      console.log(`Secret: ${secret}`);
      console.log(`Setup URL: ${totpUrl}\n`);
      
      console.log('Scan this QR code with your authenticator app:');
      qrcode.generate(totpUrl, { small: true });
      
      console.log('Test your setup by entering a TOTP code:');
      const { testCode } = await inquirer.prompt([
        {
          type: 'input',
          name: 'testCode',
          message: 'Enter TOTP code from your app:',
          validate: (input: string) => {
            const code = input.replace(/\s/g, '');
            if (!/^\d{6}$/.test(code)) {
              return 'Please enter a 6-digit code';
            }
            
            const isValid = authenticator.verify({ token: code, secret });
            return isValid ? true : 'Invalid TOTP code. Please try again.';
          }
        }
      ]);
      
      console.log('TOTP verified successfully!');
    }
    console.log('\nUser JSON:');
    console.log(JSON.stringify(user, null, 2));
    
    console.log('\nInstructions:');
    console.log('1. Copy the JSON above');
    console.log('2. Add it to your users.json file');
    console.log('3. Restart your SSOP server');

  } catch (error: any) {
    if (error && error.name === 'ExitPromptError') {
      console.log('\nUser creation cancelled');
      process.exit(0);
    }
    console.error('Error creating user:', error);
    process.exit(1);
  }
}
createUser(); 
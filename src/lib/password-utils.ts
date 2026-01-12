/**
 * Generates a strong password with the following requirements:
 * - At least 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function generateStrongPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly (minimum 12 characters total)
  const minLength = 12;
  for (let i = password.length; i < minLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validates password strength
 * Returns validation result with checks and errors
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
} {
  const errors: string[] = [];
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  if (!checks.length) errors.push('Mínimo 8 caracteres');
  if (!checks.uppercase) errors.push('Uma letra maiúscula');
  if (!checks.lowercase) errors.push('Uma letra minúscula');
  if (!checks.number) errors.push('Um número');
  if (!checks.special) errors.push('Um caractere especial (!@#$%^&*()_+-=[]{}|;:,.<>?)');

  return { valid: errors.length === 0, errors, checks };
}


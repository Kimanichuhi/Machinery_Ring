import { z } from 'zod';

/**
 * Single source of truth for password strength rules. Every place in the app
 * that validates or displays password requirements (Settings, Reset Password,
 * admin/TOT user creation) should derive from this list instead of
 * re-implementing its own regexes.
 */
export const PASSWORD_REQUIREMENTS: { label: string; test: (password: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { label: 'Contains uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { label: 'Contains lowercase letter', test: (password) => /[a-z]/.test(password) },
  { label: 'Contains a number', test: (password) => /[0-9]/.test(password) },
  {
    label: 'Contains special character (!@#$%^&*)',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

export function getPasswordRequirements(password: string) {
  return PASSWORD_REQUIREMENTS.map(({ label, test }) => ({ label, met: test(password) }));
}

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

export const passwordSchema = z
  .string()
  .refine((password) => PASSWORD_REQUIREMENTS.every(({ test }) => test(password)), {
    message: PASSWORD_REQUIREMENTS_MESSAGE,
  });

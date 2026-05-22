import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function usePasswordValidation(password: string) {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains a number', met: /[0-9]/.test(password) },
      { label: 'Contains special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const metCount = requirements.filter(r => r.met).length;
    const strength = metCount === 0 ? 0 : metCount <= 2 ? 1 : metCount <= 4 ? 2 : 3;
    const isValid = requirements.every(r => r.met);

    return { requirements, strength, isValid, metCount };
  }, [password]);
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const { requirements, strength, metCount } = usePasswordValidation(password);

  const strengthLabels = ['', 'Weak', 'Medium', 'Strong'];
  const strengthColors = ['bg-muted', 'bg-destructive', 'bg-warning', 'bg-success'];

  if (!password) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                strength >= level ? strengthColors[strength] : 'bg-muted'
              )}
            />
          ))}
        </div>
        <p className={cn(
          'text-xs font-medium',
          strength === 1 && 'text-destructive',
          strength === 2 && 'text-warning',
          strength === 3 && 'text-success'
        )}>
          {strengthLabels[strength]} {strength > 0 && `(${metCount}/5 requirements met)`}
        </p>
      </div>

      {/* Requirements list */}
      <div className="space-y-1.5">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              req.met ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

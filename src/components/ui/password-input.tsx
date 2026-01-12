import * as React from 'react';
import { Eye, EyeOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { generateStrongPassword, validatePasswordStrength } from '../../lib/password-utils';
import { cn } from '../../lib/utils';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showStrengthIndicator?: boolean;
  showGenerateButton?: boolean;
  onStrengthChange?: (isStrong: boolean) => void;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

export function PasswordInput({
  label,
  showStrengthIndicator = true,
  showGenerateButton = true,
  onStrengthChange,
  value,
  onChange,
  id,
  placeholder = 'Digite a senha',
  required = false,
  className,
  error,
  name,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showStrength, setShowStrength] = React.useState(false);

  const strength = value ? validatePasswordStrength(value) : null;

  React.useEffect(() => {
    if (onStrengthChange && strength) {
      onStrengthChange(strength.valid);
    }
  }, [strength, onStrengthChange]);

  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword();
    const syntheticEvent = {
      target: { 
        value: newPassword,
        name: name || id || 'password',
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowPassword(true);
    setShowStrength(true);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={id}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {showGenerateButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGeneratePassword}
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Gerar senha
            </Button>
          )}
        </div>
      )}
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setShowStrength(true)}
          placeholder={placeholder}
          required={required}
          className={cn(
            'pr-20',
            error && 'border-red-500 focus-visible:ring-red-500',
            strength?.valid && showStrength && 'border-green-500 focus-visible:ring-green-500'
          )}
          {...props}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {!label && showGenerateButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGeneratePassword}
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Gerar senha forte"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-500 hover:text-gray-700 p-1"
            title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          {error}
        </p>
      )}
      {showStrengthIndicator && showStrength && value && strength && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {strength.valid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">Senha forte</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600 font-medium">Senha fraca</span>
              </>
            )}
          </div>
          {!strength.valid && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Requisitos da senha:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {strength.checks.length ? (
                  <li className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Mínimo 8 caracteres
                  </li>
                ) : (
                  <li className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Mínimo 8 caracteres
                  </li>
                )}
                {strength.checks.uppercase ? (
                  <li className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Uma letra maiúscula
                  </li>
                ) : (
                  <li className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Uma letra maiúscula
                  </li>
                )}
                {strength.checks.lowercase ? (
                  <li className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Uma letra minúscula
                  </li>
                ) : (
                  <li className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Uma letra minúscula
                  </li>
                )}
                {strength.checks.number ? (
                  <li className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Um número
                  </li>
                ) : (
                  <li className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Um número
                  </li>
                )}
                {strength.checks.special ? (
                  <li className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Um caractere especial (!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?)
                  </li>
                ) : (
                  <li className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Um caractere especial (!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?)
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { useCEP } from '@/hooks/use-cep';
import { formatCEPInput, isValidCEPFormat } from '@/lib/validation';

interface CEPInputProps {
  value: string;
  onChange: (value: string) => void;
  onCEPData?: (data: any) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CEPInput({
  value,
  onChange,
  onCEPData,
  label = 'CEP',
  placeholder = '00000-000',
  className,
  disabled = false,
}: CEPInputProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const { data: cepData, loading: isLoading, error, fetchCEP } = useCEP();
  const lastSearchedCEP = useRef<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    if (cepData && onCEPData) {
      onCEPData(cepData);
    }
    // Important: do NOT include onCEPData in the deps, or parents passing
    // inline functions will create a new reference every render and re-run
    // this effect, causing update loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepData]);

  const clearError = () => {
    setLocalError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEPInput(e.target.value);
    setLocalValue(formatted);
    onChange(formatted);
    clearError();

    // Auto-trigger search when CEP is complete (8 digits) and different from last search
    const cleanCEP = formatted.replace(/\D/g, '');
    if (cleanCEP.length === 8 && cleanCEP !== lastSearchedCEP.current) {
      lastSearchedCEP.current = cleanCEP;
      // Use the freshly typed value to avoid stale state
      handleSearch(formatted);
    }
  };

  const handleSearch = async (valueOverride?: string) => {
    const valueToUse = (valueOverride ?? localValue) || '';
    if (valueToUse && isValidCEPFormat(valueToUse)) {
      const cleanCEP = valueToUse.replace(/\D/g, '');
      lastSearchedCEP.current = cleanCEP;
      await fetchCEP(valueToUse);
    }
  };

  const isInvalidCEP = localValue && localValue.length > 0 && !isValidCEPFormat(localValue) && localValue.replace(/\D/g, '').length > 0;
  const displayError = error || localError;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className={className}>
      <Label htmlFor="cep">{label}</Label>
      <div className="flex gap-2">
        <Input
          id="cep"
          value={localValue || ''}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={displayError || isInvalidCEP ? 'border-red-500' : ''}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSearch()}
          disabled={disabled || isLoading || !localValue || !isValidCEPFormat(localValue)}
          className="px-3"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>
      {displayError && (
        <p className="text-sm text-red-500 mt-1">{displayError}</p>
      )}
      {isInvalidCEP && !displayError && (
        <p className="text-sm text-red-500 mt-1">CEP deve ter 8 dígitos</p>
      )}
      {cepData && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            <strong>{cepData.logradouro}</strong> - {cepData.bairro}
          </p>
          <p className="text-sm text-green-700">
            {cepData.cidade} - {cepData.estado}
          </p>
        </div>
      )}
    </div>
  );
}

import { Lock } from 'lucide-react';
import { Badge } from './badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface FrozenBadgeProps {
  reason?: string | null;
  className?: string;
}

export function FrozenBadge({ reason, className = '' }: FrozenBadgeProps) {
  const badge = (
    <Badge
      variant="destructive"
      className={`gap-1 ${className}`}
    >
      <Lock className="w-3 h-3" />
      Congelado
    </Badge>
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

// Export a frozen user badge variant
export function FrozenUserBadge({ reason, className = '' }: FrozenBadgeProps) {
  const badge = (
    <Badge
      variant="secondary"
      className={`gap-1 bg-amber-100 text-amber-800 ${className}`}
    >
      <Lock className="w-3 h-3" />
      Desativado
    </Badge>
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

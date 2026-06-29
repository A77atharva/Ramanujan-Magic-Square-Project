import React from 'react';
import { cn } from '../../lib/utils';

const ACTIVE_CLASSES: Record<string, string> = {
  row: 'bg-teal-500/20 text-teal-300 border-teal-500/50',
  column: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  diagonal: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  corner: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  block2x2: 'bg-pink-500/20 text-pink-300 border-pink-500/50',
};

const HOVER_CLASSES: Record<string, string> = {
  row: 'hover:bg-teal-500/20 hover:text-teal-300 hover:border-teal-500/50',
  column: 'hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50',
  diagonal: 'hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/50',
  corner: 'hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/50',
  block2x2: 'hover:bg-pink-500/20 hover:text-pink-300 hover:border-pink-500/50',
};

const LABELS: Record<string, string> = {
  row: 'Rows',
  column: 'Columns',
  diagonal: 'Diagonals',
  corner: 'Corners',
  block2x2: '2×2 Blocks',
};

const PATTERN_ORDER = ['row', 'column', 'diagonal', 'corner', 'block2x2'];

interface PatternFiltersProps {
  activeType: string | null;
  onSelect: (type: string | null) => void;
  availableTypes: string[];
}

export function PatternFilters({ activeType, onSelect, availableTypes }: PatternFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {PATTERN_ORDER.map((type) => {
        if (!availableTypes.includes(type)) return null;
        const isActive = activeType === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(isActive ? null : type)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-sm",
              isActive
                ? `shadow-lg scale-105 ${ACTIVE_CLASSES[type] || ''}`
                : `bg-black/20 border-white/10 text-muted-foreground ${HOVER_CLASSES[type] || ''}`
            )}
          >
            {LABELS[type] || type}
          </button>
        );
      })}
    </div>
  );
}

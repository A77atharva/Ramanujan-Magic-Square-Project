import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface MatrixGridProps {
  matrix: number[][];
  highlightedCells?: number[][];
  highlightType?: string;
}

export function MatrixGrid({ matrix, highlightedCells = [], highlightType }: MatrixGridProps) {
  const isHighlighted = (r: number, c: number) => 
    highlightedCells.some(([hr, hc]) => hr === r && hc === c);

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 p-4 sm:p-6 bg-black/20 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm max-w-xl mx-auto w-full">
      {matrix.map((row, rIndex) => (
        row.map((cell, cIndex) => {
          const highlight = isHighlighted(rIndex, cIndex);
          return (
            <motion.div
              key={`${rIndex}-${cIndex}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.4, 
                delay: (rIndex * 4 + cIndex) * 0.05,
                ease: [0.23, 1, 0.32, 1]
              }}
              className={cn(
                "aspect-square flex items-center justify-center rounded-xl sm:rounded-2xl text-2xl sm:text-3xl lg:text-4xl font-serif font-bold transition-all duration-500",
                "border bg-card/40 text-foreground",
                highlight && highlightType && `cell-highlight-${highlightType}`,
                highlight && "scale-105 z-10",
                !highlight && highlightedCells.length > 0 && "opacity-30 scale-95"
              )}
            >
              {cell}
            </motion.div>
          );
        })
      ))}
    </div>
  );
}

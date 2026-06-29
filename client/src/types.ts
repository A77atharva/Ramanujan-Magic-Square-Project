export interface Pattern {
  type: 'row' | 'column' | 'diagonal' | 'corner' | 'block2x2';
  label: string;
  cells: number[][];
  equation: string;
  sum: number;
}

export interface MagicSquareData {
  name: string;
  dateOfBirth: string;
  magicConstant: number;
  matrix: number[][];
  patterns: Pattern[];
  dd: number;
  mm: number;
  yy: number;
  YY: number;
}

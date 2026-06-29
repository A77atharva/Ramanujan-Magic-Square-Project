export interface Pattern {
  type: 'row' | 'column' | 'diagonal' | 'corner' | 'block2x2';
  label: string;
  cells: number[][];
  equation: string;
  sum: number;
}

export interface MagicSquareResult {
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

export function generateMagicSquare(name: string, dateOfBirth: string): MagicSquareResult {
  const parts = dateOfBirth.split('/');
  if (parts.length !== 3) throw new Error('Invalid date format. Use DD/MM/YYYY');

  const dd = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const fullYear = parseInt(parts[2], 10);
  if (isNaN(dd) || isNaN(mm) || isNaN(fullYear)) throw new Error('Invalid date values');

  const yy = fullYear % 100;
  const YY = Math.floor(fullYear / 100);

  const matrix: number[][] = [
    [dd,      mm,      YY,      yy],
    [yy + 1,  YY - 1,  mm - 3,  dd + 3],
    [mm - 2,  dd + 2,  yy + 2,  YY - 2],
    [YY + 1,  yy - 1,  dd + 1,  mm - 1],
  ];

  const magicConstant = dd + mm + yy + YY;
  const patterns: Pattern[] = [];

  for (let r = 0; r < 4; r++) {
    const cells = matrix[r].map((_, c) => [r, c]);
    patterns.push({ type: 'row', label: `R${r+1}`, cells, equation: `R${r+1}: ${matrix[r].join(' + ')} = ${magicConstant}`, sum: magicConstant });
  }
  for (let c = 0; c < 4; c++) {
    const cells = [0,1,2,3].map(r => [r, c]);
    const vals = [0,1,2,3].map(r => matrix[r][c]);
    patterns.push({ type: 'column', label: `C${c+1}`, cells, equation: `C${c+1}: ${vals.join(' + ')} = ${magicConstant}`, sum: magicConstant });
  }

  const d1c = [0,1,2,3].map(i => [i,i]);
  const d1v = [0,1,2,3].map(i => matrix[i][i]);
  patterns.push({ type: 'diagonal', label: 'D1', cells: d1c, equation: `D1: ${d1v.join(' + ')} = ${magicConstant}`, sum: magicConstant });
  const d2c = [0,1,2,3].map(i => [i, 3-i]);
  const d2v = [0,1,2,3].map(i => matrix[i][3-i]);
  patterns.push({ type: 'diagonal', label: 'D2', cells: d2c, equation: `D2: ${d2v.join(' + ')} = ${magicConstant}`, sum: magicConstant });

  const cornerCells = [[0,0],[0,3],[3,0],[3,3]];
  const cornerVals = cornerCells.map(([r,c]) => matrix[r][c]);
  patterns.push({ type: 'corner', label: 'Corners', cells: cornerCells, equation: `Corners: ${cornerVals.join(' + ')} = ${magicConstant}`, sum: magicConstant });

  const blockPositions = [
    [[0,0],[0,1],[1,0],[1,1]], [[0,2],[0,3],[1,2],[1,3]],
    [[1,0],[1,1],[2,0],[2,1]], [[1,1],[1,2],[2,1],[2,2]],
    [[1,2],[1,3],[2,2],[2,3]], [[1,3],[1,0],[2,3],[2,0]],
    [[2,0],[2,1],[3,0],[3,1]], [[2,2],[2,3],[3,2],[3,3]],
    [[3,0],[3,1],[0,0],[0,1]], [[3,1],[3,2],[0,1],[0,2]],
    [[3,2],[3,3],[0,2],[0,3]], [[3,3],[3,0],[0,3],[0,0]],
  ];

  blockPositions.forEach((blockCells, idx) => {
    const vals = blockCells.map(([r,c]) => matrix[r][c]);
    if (vals.reduce((a,b) => a+b, 0) === magicConstant) {
      patterns.push({ type: 'block2x2', label: `B${idx+1}`, cells: blockCells, equation: `${vals.join(' + ')} = ${magicConstant}`, sum: magicConstant });
    }
  });

  return { name, dateOfBirth, magicConstant, matrix, patterns, dd, mm, yy, YY };
}

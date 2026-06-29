import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { MagicSquareResult, Pattern } from './magicSquare.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', '..', 'client', 'public');

function loadImageB64(filePath: string, mime: string): string | null {
  try {
    const data = fs.readFileSync(filePath);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch { return null; }
}

export interface OrgContext { orgName: string; logoData?: string | null; }

type RGB = [number, number, number];
const C = {
  purple:    [62,  20,  90]  as RGB,
  purpleMed: [95,  40, 130]  as RGB,
  gold:      [190, 140,  20]  as RGB,
  cream:     [252, 248, 240]  as RGB,
  white:     [255, 255, 255]  as RGB,
  textDark:  [ 50,  20,  80]  as RGB,
  textMid:   [100,  70, 130]  as RGB,
  textLight: [160, 130, 180]  as RGB,
  grayLine:  [210, 200, 220]  as RGB,
  row:       [ 37,  99, 235]  as RGB,
  col:       [  5, 150, 105]  as RGB,
  diag:      [124,  58, 237]  as RGB,
  corner:    [217, 119,   6]  as RGB,
  blk:       [219,  39, 119]  as RGB,
};
const ACCENT: Record<string, RGB> = {
  row: C.row, column: C.col, diagonal: C.diag, corner: C.corner, block2x2: C.blk,
};

const sf = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const sd = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
const st = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

function addImageSafe(doc: jsPDF, b64: string, fmt: string, x: number, y: number, w: number, h: number) {
  try { doc.addImage(b64, fmt, x, y, w, h); } catch { }
}

function drawHeader(doc: jsPDF, W: number, logoB64: string | null) {
  sf(doc, C.purple); doc.rect(0, 0, W, 22, 'F');
  if (logoB64) addImageSafe(doc, logoB64, 'PNG', W / 2 - 40, 1, 80, 20);
}

function drawFooter(doc: jsPDF, W: number, H: number, pg: number, total: number, orgName: string) {
  sf(doc, C.purple); doc.rect(0, H - 11, W, 11, 'F');
  st(doc, C.textLight);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const d = new Date();
  const ds = `Generated: ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  doc.text(ds, 14, H - 3.5);
  doc.text(orgName, W / 2, H - 3.5, { align: 'center' });
  doc.text(`Page ${pg} of ${total}`, W - 14, H - 3.5, { align: 'right' });
}

function pageSetup(doc: jsPDF, W: number, H: number, logo: string | null, pg: number, total: number, title: string, orgName: string) {
  drawHeader(doc, W, logo);
  sf(doc, C.cream); doc.rect(0, 22, W, H - 33, 'F');
  st(doc, C.purple); doc.setFont('times', 'bold'); doc.setFontSize(17);
  doc.text(title, W / 2, 34, { align: 'center' });
  sd(doc, C.gold); doc.setLineWidth(0.6);
  doc.line(28, 37.5, W - 28, 37.5);
  drawFooter(doc, W, H, pg, total, orgName);
}

function drawMatrix(doc: jsPDF, matrix: number[][], x: number, y: number, cs: number, hl?: number[][], hlType?: string) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cx = x + c * cs, cy = y + r * cs;
      const isHL = hl?.some(([hr, hc]) => hr === r && hc === c) ?? false;
      if (isHL && hlType) { sf(doc, ACCENT[hlType]); sd(doc, ACCENT[hlType]); }
      else { sf(doc, C.white); sd(doc, C.grayLine); }
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, cy, cs, cs, 1.5, 1.5, 'FD');
      st(doc, isHL && hlType ? C.white : C.textDark);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(cs * 0.78);
      doc.text(matrix[r][c].toString(), cx + cs / 2, cy + cs * 0.68, { align: 'center' });
    }
  }
}

function drawColLabels(doc: jsPDF, x: number, y: number, cs: number) {
  st(doc, C.textLight);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  ['DD', 'MM', 'CC', 'YY'].forEach((l, c) => doc.text(l, x + c * cs + cs / 2, y, { align: 'center' }));
}

function drawEq(doc: jsPDF, eq: string, cx: number, y: number, hlType: string, maxW: number) {
  st(doc, ACCENT[hlType]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(eq, cx, y, { align: 'center', maxWidth: maxW });
}

function draw2ColPatterns(doc: jsPDF, patterns: Pattern[], matrix: number[][], startY: number, W: number, mg: number, cs: number) {
  const matW = cs * 4;
  const panW = (W - mg * 2 - 12) / 2;
  const panH = cs * 4 + 6 + 12;
  patterns.forEach((pat, idx) => {
    const col = idx % 2, row = Math.floor(idx / 2);
    const px = mg + col * (panW + 12), py = startY + row * (panH + 10);
    const mx = px + (panW - matW) / 2;
    drawMatrix(doc, matrix, mx, py, cs, pat.cells, pat.type);
    drawColLabels(doc, mx, py + cs * 4 + 5, cs);
    drawEq(doc, pat.equation, px + panW / 2, py + cs * 4 + 13, pat.type, panW - 8);
  });
}

export async function generateBirthdayPDF(data: MagicSquareResult, org?: OrgContext | null): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const mg = 14, TOTAL = 6;

  const displayOrgName = org?.orgName ?? 'Ramanujan Birthday Magic Square';
  const DEVELOPER = 'Developed by Atharva Vaijnath Bhagwat';

  let logoB64: string | null = null;
  if (org?.logoData) {
    logoB64 = org.logoData;
  } else {
    logoB64 = loadImageB64(path.join(publicDir, 'logo.png'), 'image/png');
  }
  const ramB64 = loadImageB64(path.join(publicDir, 'images', 'ramanujan-photo.jpg'), 'image/jpeg');

  const rows  = data.patterns.filter(p => p.type === 'row');
  const cols  = data.patterns.filter(p => p.type === 'column');
  const diags = data.patterns.filter(p => p.type === 'diagonal');
  const corn  = data.patterns.filter(p => p.type === 'corner');
  const blks  = data.patterns.filter(p => p.type === 'block2x2');

  /* PAGE 1 – COVER */
  drawHeader(doc, W, logoB64);
  sf(doc, C.cream); doc.rect(0, 22, W, H - 33, 'F');
  let y = 32;
  st(doc, C.purple); doc.setFont('times', 'bold'); doc.setFontSize(26);
  doc.text('Happy Birthday,', W / 2, y, { align: 'center' });
  y += 11;
  st(doc, C.gold); doc.setFontSize(22);
  doc.text(`${data.name}!`, W / 2, y, { align: 'center' });
  y += 8;
  st(doc, C.textMid); doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(`Date of Birth: ${data.dateOfBirth}`, W / 2, y, { align: 'center' });
  y += 6;
  sd(doc, C.gold); doc.setLineWidth(0.6);
  doc.line(mg + 20, y, W - mg - 20, y);
  y += 6;
  const pW = 34, pH = 43;
  if (ramB64) {
    sd(doc, C.gold); doc.setLineWidth(0.5);
    addImageSafe(doc, ramB64, 'JPEG', mg, y, pW, pH);
    doc.rect(mg, y, pW, pH);
    st(doc, C.textLight); doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
    doc.text('Srinivasa Ramanujan\n(22 Dec 1887 – 26 Apr 1920)', mg + pW / 2, y + pH + 5, { align: 'center' });
  }
  const tx = mg + pW + 7, tW = W - mg - pW - 7 - mg;
  st(doc, C.purple); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('About Srinivasa Ramanujan', tx, y + 5);
  st(doc, C.textDark); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  let ty = y + 13;
  [
    'Srinivasa Ramanujan (22 Dec 1887 – 26 Apr 1920) was one of the greatest mathematical geniuses in history, born in Erode, Tamil Nadu, India.',
    'Despite no formal training, he made extraordinary contributions to number theory, infinite series, and continued fractions.',
    'He collaborated with G. H. Hardy at Cambridge University, producing remarkable research that continues to influence mathematics today.',
    'The Ramanujan Birthday Magic Square encodes the birth date in its first row — and every row, column, diagonal and 2x2 block sums to the same magic constant.',
  ].forEach(line => {
    const wrapped = doc.splitTextToSize(line, tW);
    doc.text(wrapped, tx, ty);
    ty += wrapped.length * 5.5 + 1;
  });
  y += pH + 12;
  sd(doc, C.grayLine); doc.setLineWidth(0.3);
  doc.line(mg, y, W - mg, y);
  y += 9;
  st(doc, C.purple); doc.setFont('times', 'bold'); doc.setFontSize(16);
  doc.text('Your Personal Magic Square', W / 2, y, { align: 'center' });
  y += 8;
  st(doc, C.gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(`Magic Constant = ${data.magicConstant}`, W / 2, y, { align: 'center' });
  y += 5;
  const csCover = 16, matXC = (W - csCover * 4) / 2;
  drawMatrix(doc, data.matrix, matXC, y, csCover);
  drawColLabels(doc, matXC, y + csCover * 4 + 6, csCover);
  y += csCover * 4 + 14;
  sd(doc, C.gold); doc.setLineWidth(0.5);
  doc.line(mg + 15, y, W - mg - 15, y);
  y += 8;
  st(doc, C.textMid); doc.setFont('times', 'bolditalic'); doc.setFontSize(12);
  const q1 = '"An equation for me has no meaning, unless it expresses a thought of God."';
  const q1Lines = doc.splitTextToSize(q1, W - mg * 2 - 20);
  doc.text(q1Lines, W / 2, y, { align: 'center' });
  y += q1Lines.length * 6.5 + 2;
  st(doc, C.gold); doc.setFont('times', 'bold'); doc.setFontSize(10);
  doc.text('- Srinivasa Ramanujan', W / 2, y, { align: 'center' });
  drawFooter(doc, W, H, 1, TOTAL, displayOrgName);

  /* PAGE 2 – ROWS */
  doc.addPage();
  pageSetup(doc, W, H, logoB64, 2, TOTAL, 'Row Patterns', displayOrgName);
  st(doc, C.textMid); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('All Row Patterns', mg, 44);
  draw2ColPatterns(doc, rows, data.matrix, 49, W, mg, 13);

  /* PAGE 3 – COLUMNS */
  doc.addPage();
  pageSetup(doc, W, H, logoB64, 3, TOTAL, 'Column Patterns', displayOrgName);
  st(doc, C.textMid); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('All Column Patterns', mg, 44);
  draw2ColPatterns(doc, cols, data.matrix, 49, W, mg, 13);

  /* PAGE 4 – DIAG + CORNER */
  doc.addPage();
  pageSetup(doc, W, H, logoB64, 4, TOTAL, 'Diagonal & Corner Patterns', displayOrgName);
  let py4 = 44;
  const panW4 = (W - mg * 2 - 12) / 2, cs4 = 13;
  st(doc, C.textMid); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Diagonal Patterns', mg, py4);
  py4 += 5;
  diags.forEach((pat, idx) => {
    const px = mg + idx * (panW4 + 12), mx = px + (panW4 - cs4 * 4) / 2;
    drawMatrix(doc, data.matrix, mx, py4, cs4, pat.cells, pat.type);
    drawColLabels(doc, mx, py4 + cs4 * 4 + 5, cs4);
    drawEq(doc, pat.equation, px + panW4 / 2, py4 + cs4 * 4 + 13, pat.type, panW4 - 8);
  });
  py4 += cs4 * 4 + 20;
  sd(doc, C.grayLine); doc.setLineWidth(0.3);
  doc.line(mg, py4 - 5, W - mg, py4 - 5);
  st(doc, C.textMid); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Corner Pattern', mg, py4);
  py4 += 5;
  if (corn[0]) {
    const mx = (W - cs4 * 4) / 2;
    drawMatrix(doc, data.matrix, mx, py4, cs4, corn[0].cells, corn[0].type);
    drawColLabels(doc, mx, py4 + cs4 * 4 + 5, cs4);
    drawEq(doc, corn[0].equation, W / 2, py4 + cs4 * 4 + 13, corn[0].type, 90);
  }

  /* PAGE 5 – 2x2 BLOCKS */
  doc.addPage();
  pageSetup(doc, W, H, logoB64, 5, TOTAL, `All 2x2 Consecutive Magic Blocks (${blks.length} found)`, displayOrgName);
  st(doc, C.textLight); doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
  doc.text('Each block consists of four adjacent/consecutive cells (including wrap-around edges)', W / 2, 40, { align: 'center' });
  const cs5 = 10, cols3 = 3;
  const panW5 = (W - mg * 2 - (cols3 - 1) * 6) / cols3, panH5 = cs5 * 4 + 12, startY5 = 46;
  blks.forEach((pat, idx) => {
    const col = idx % cols3, row2 = Math.floor(idx / cols3);
    const px = mg + col * (panW5 + 6), py = startY5 + row2 * (panH5 + 8), mx = px + (panW5 - cs5 * 4) / 2;
    drawMatrix(doc, data.matrix, mx, py, cs5, pat.cells, pat.type);
    drawEq(doc, pat.equation, px + panW5 / 2, py + cs5 * 4 + 9, pat.type, panW5 - 4);
  });

  /* PAGE 6 – SUMMARY */
  doc.addPage();
  pageSetup(doc, W, H, logoB64, 6, TOTAL, 'Magic Structure Statistics & Validation', displayOrgName);
  const statItems: Array<{ label: string; val: number; bold?: boolean }> = [
    { label: 'Magic Constant (Birth Year Split Sum)', val: data.magicConstant },
    { label: 'Row Magic Structures',                  val: rows.length },
    { label: 'Column Magic Structures',               val: cols.length },
    { label: 'Diagonal Magic Structures',             val: diags.length },
    { label: 'Corner Magic Structure',                val: corn.length },
    { label: '2x2 Consecutive Block Structures',      val: blks.length },
    { label: 'Total Verified Magic Structures',       val: data.patterns.length, bold: true },
  ];
  let sy = 52;
  statItems.forEach(s => {
    if (s.bold) {
      sf(doc, [238, 225, 255] as RGB); sd(doc, C.gold); doc.setLineWidth(0.5);
      doc.roundedRect(mg, sy - 6, W - mg * 2, 10, 1.5, 1.5, 'FD');
    } else {
      sd(doc, C.grayLine); doc.setLineWidth(0.2);
      doc.line(mg + 4, sy + 3, W - mg - 4, sy + 3);
    }
    st(doc, s.bold ? C.purple : C.textDark);
    doc.setFont('helvetica', s.bold ? 'bold' : 'normal'); doc.setFontSize(11);
    doc.text(s.label, mg + 7, sy);
    doc.text(String(s.val), W - mg - 7, sy, { align: 'right' });
    sy += 13;
  });
  sy += 8;
  st(doc, C.purple); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Pattern Colour Legend', mg + 6, sy);
  sy += 10;
  [
    { label: 'Rows', type: 'row' }, { label: 'Columns', type: 'column' },
    { label: 'Diagonals', type: 'diagonal' }, { label: 'Corners', type: 'corner' },
    { label: '2x2 Consecutive Blocks', type: 'block2x2' },
  ].forEach((item, idx) => {
    const col = idx % 3, row2 = Math.floor(idx / 3);
    const lx = mg + 6 + col * 62, ly = sy + row2 * 12;
    sf(doc, ACCENT[item.type]);
    doc.roundedRect(lx, ly - 5, 16, 7, 2, 2, 'F');
    st(doc, C.textDark); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(item.label, lx + 19, ly);
  });
  sy += Math.ceil(5 / 3) * 12 + 14;
  sd(doc, C.gold); doc.setLineWidth(0.5);
  doc.line(mg + 10, sy, W - mg - 10, sy);
  sy += 9;
  st(doc, C.textMid); doc.setFont('times', 'bolditalic'); doc.setFontSize(12);
  const q2 = '"Mathematics is not just about numbers - it is the language in which God has written the universe."';
  const q2Lines = doc.splitTextToSize(q2, W - mg * 2 - 14);
  doc.text(q2Lines, W / 2, sy, { align: 'center' });
  sy += q2Lines.length * 6.5 + 3;
  st(doc, C.gold); doc.setFont('times', 'bold'); doc.setFontSize(10);
  doc.text('- Srinivasa Ramanujan', W / 2, sy, { align: 'center' });
  sy += 14;
  st(doc, C.textLight); doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  doc.text(DEVELOPER, W / 2, sy, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

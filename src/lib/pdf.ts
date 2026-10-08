/* Client-side PDF generation (lazy-loaded jsPDF — MIT, bundled locally, $0). */
import { prefs } from './prefs';
import { fmtDate, todayISO } from './format';

export interface PdfDoc {
  doc: any;
  y: number;
  margin: number;
  pageW: number;
  pageH: number;
}

export async function createPdf(filename: string, title: string, build: (p: PdfDoc) => void): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 56;

  // Header
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, pageW, 86, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('PakUtility', margin, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.text('Everyday tools. One place.  |  Developed by ASNA Consultancy', margin, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, margin, 72);

  y = 108;
  const p: PdfDoc = { doc, y, margin, pageW, pageH };

  const ensure = (need: number) => {
    if (p.y + need > pageH - 70) {
      doc.addPage();
      p.y = 56;
    }
  };

  // Business block
  if (prefs.businessName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(23, 32, 51);
    ensure(60);
    doc.text(prefs.businessName, margin, p.y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(102, 112, 133);
    p.y += 14;
    if (prefs.businessAddress) {
      doc.text(prefs.businessAddress, margin, p.y);
      p.y += 13;
    }
    const contact = [prefs.businessPhone, prefs.businessEmail].filter(Boolean).join('  |  ');
    if (contact) {
      doc.text(contact, margin, p.y);
      p.y += 13;
    }
    p.y += 8;
  }

  build(p);

  // Footer on all pages
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 170);
    doc.text(`Generated with PakUtility on ${fmtDate(todayISO())}  •  Developed by ASNA Consultancy`, margin, pageH - 28);
    doc.text(`Page ${i} of ${pages}`, pageW - margin - 60, pageH - 28);
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export function pdfText(p: PdfDoc, text: string, opts: { size?: number; bold?: boolean; gap?: number; color?: [number, number, number] } = {}) {
  const { doc } = p;
  const size = opts.size || 10;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...(opts.color || [23, 32, 51]));
  const lines: string[] = doc.splitTextToSize(text, p.pageW - p.margin * 2);
  for (const line of lines) {
    if (p.y + size + 4 > p.pageH - 70) {
      doc.addPage();
      p.y = 56;
    }
    doc.text(line, p.margin, p.y);
    p.y += size * 1.35;
  }
  p.y += opts.gap ?? 6;
}

export function pdfKV(p: PdfDoc, k: string, v: string) {
  const { doc } = p;
  if (p.y + 16 > p.pageH - 70) {
    doc.addPage();
    p.y = 56;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(102, 112, 133);
  doc.text(k, p.margin, p.y);
  doc.setTextColor(23, 32, 51);
  doc.setFont('helvetica', 'bold');
  doc.text(v, p.margin + 170, p.y);
  p.y += 17;
}

/** Simple table renderer. widths are fractions of usable width. */
export function pdfTable(p: PdfDoc, head: string[], rows: string[][], widths: number[], opts: { alignRight?: number[] } = {}) {
  const { doc } = p;
  const usable = p.pageW - p.margin * 2;
  const colX: number[] = [];
  let acc = p.margin;
  for (const w of widths) {
    colX.push(acc);
    acc += w * usable;
  }
  const drawHead = () => {
    doc.setFillColor(11, 31, 58);
    doc.rect(p.margin, p.y - 11, usable, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    head.forEach((h, i) => doc.text(h, colX[i] + 4, p.y + 3));
    p.y += 22;
  };
  drawHead();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  rows.forEach((row, ri) => {
    if (p.y + 18 > p.pageH - 70) {
      doc.addPage();
      p.y = 56;
      drawHead();
    }
    if (ri % 2 === 0) {
      doc.setFillColor(246, 248, 251);
      doc.rect(p.margin, p.y - 11, usable, 19, 'F');
    }
    doc.setTextColor(23, 32, 51);
    row.forEach((cell, i) => {
      const right = opts.alignRight?.includes(i);
      const x = right ? colX[i] + widths[i] * usable - 6 : colX[i] + 4;
      doc.text(String(cell ?? ''), x, p.y + 2, { align: right ? 'right' : 'left' });
    });
    p.y += 19;
  });
  p.y += 8;
}

export function pdfTotal(p: PdfDoc, label: string, value: string) {
  const { doc } = p;
  if (p.y + 24 > p.pageH - 70) {
    doc.addPage();
    p.y = 56;
  }
  doc.setFillColor(11, 31, 58);
  doc.rect(p.pageW - p.margin - 240, p.y - 13, 240, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(212, 175, 55);
  doc.text(label, p.pageW - p.margin - 228, p.y + 4);
  doc.setTextColor(255, 255, 255);
  doc.text(value, p.pageW - p.margin - 12, p.y + 4, { align: 'right' });
  p.y += 34;
}

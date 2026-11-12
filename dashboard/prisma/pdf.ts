/**
 * Minimal valid single-page PDF builder (no dependencies).
 * Used by the seed to give demo documents real, viewable content.
 * Text is sanitized to ASCII so Helvetica/WinAnsi rendering is safe.
 */
function ascii(s: string): string {
  return s
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function mkPdf(title: string, lines: string[]): Buffer {
  const safeTitle = ascii(title);
  const body = lines.map(ascii);
  const stamp = `Kafeely Document Vault - generated ${new Date().toISOString().slice(0, 10)}`;

  const content = [
    "0.968627 0.658824 0.494118 rg", // brand gold #C5A880
    `72 782 451 3 re f`,
    "0.043137 0.074510 0.168627 rg", // navy #0B132B
    `BT /F2 20 Tf 72 750 Td (${safeTitle}) Tj ET`,
    "0.35 0.37 0.42 rg",
    ...body.map((l, i) => `BT /F1 11 Tf 72 ${712 - i * 18} Td (${l}) Tj ET`),
    "0.55 0.57 0.60 rg",
    `BT /F1 8 Tf 72 42 Td (${ascii(stamp)}) Tj ET`,
  ].join("\n");

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, idx) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

/** Demo content describing the stored document. */
export function demoPdf(name: string, category: string, status: string): Buffer {
  const words = name.split(/[-\u2014]/)[0].trim();
  return mkPdf(name, [
    `Document type: ${category.toUpperCase()}    Status: ${status.toUpperCase()}`,
    ``,
    `This document is part of the Kafeely secure document vault.`,
    `It is stored encrypted at rest and every access is logged.`,
    ``,
    `Reference: ${words.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 24).toUpperCase() || "KF-DOC"}-2026`,
    `Issuing platform: Kafeely Rental Income Protection, Dubai, UAE`,
    ``,
    `The original signed copy is retained by the document owner.`,
    `Use the viewer actions to print or download this file at any time.`,
  ]);
}

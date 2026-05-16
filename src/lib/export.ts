import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

export function exportTxt(text: string, base = "transcription") {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${base}-${stamp()}.txt`);
}

export async function exportDocx(text: string, base = "transcription", title?: string) {
  const paragraphs: Paragraph[] = [];
  if (title) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: title, bold: true })],
      })
    );
  }
  text.split(/\n+/).forEach((line) => {
    paragraphs.push(new Paragraph({ children: [new TextRun(line)] }));
  });
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [{ children: paragraphs }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${base}-${stamp()}.docx`);
}

export function exportPdf(text: string, base = "transcription", title?: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const height = pdf.internal.pageSize.getHeight() - margin * 2;
  let y = margin;
  if (title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(title, margin, y);
    y += 24;
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  const lines = pdf.splitTextToSize(text, width);
  for (const line of lines) {
    if (y > height + margin - 14) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 16;
  }
  pdf.save(`${base}-${stamp()}.pdf`);
}

const fmt = (s: number) => {
  const ms = Math.floor((s % 1) * 1000);
  const total = Math.floor(s);
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss},${String(ms).padStart(3, "0")}`;
};

// Count Afaan Oromo syllables: vowel groups (aa/ee/ii/oo/uu count as 1).
const syllableWeight = (s: string) => {
  const lower = s.toLowerCase();
  const matches = lower.match(/[aeiou]+/g);
  // Fall back to char-count weight so silent/short tokens still consume time
  return (matches?.length ?? 0) + Math.max(0, lower.length) * 0.05 + 0.5;
};

/**
 * Build .srt aligned to spoken audio.
 * - Splits text at sentence boundaries first, then breaks long sentences into ~7-word cues.
 * - Distributes time proportionally to syllable count (better fit than equal slots).
 * - Inserts small gaps between cues so subtitles don't crowd.
 * - Caps cue duration to a readable range (1.2s min, 6s max).
 */
export function exportSrt(text: string, duration: number | undefined, base = "subtitles") {
  const clean = text.trim();
  if (!clean) return;

  // 1. Sentence split, then word-chunk long sentences.
  const sentences = clean
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const maxWords = 9;
  const minWords = 3;
  const cueTexts: string[] = [];
  for (const sent of sentences) {
    const words = sent.split(/\s+/);
    if (words.length <= maxWords) {
      cueTexts.push(sent);
      continue;
    }
    // Prefer breaking at commas within long sentences
    const commaParts = sent.split(/,\s+/);
    const buf: string[] = [];
    let count = 0;
    const flush = () => { if (buf.length) { cueTexts.push(buf.join(", ")); buf.length = 0; count = 0; } };
    for (const part of commaParts) {
      const w = part.split(/\s+/).length;
      if (count + w > maxWords && count >= minWords) flush();
      buf.push(part);
      count += w;
    }
    flush();
    // If a single comma-part is still huge, hard-chunk by words.
    const expanded: string[] = [];
    for (const c of cueTexts.splice(0)) {
      const w = c.split(/\s+/);
      if (w.length <= maxWords) { expanded.push(c); continue; }
      for (let i = 0; i < w.length; i += maxWords) expanded.push(w.slice(i, i + maxWords).join(" "));
    }
    cueTexts.push(...expanded);
  }

  if (!cueTexts.length) return;

  // 2. Weight each cue by syllable count and distribute time proportionally.
  const weights = cueTexts.map(syllableWeight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const total = duration && duration > 0 ? duration : Math.max(2, cueTexts.length * 2.5);
  const gap = 0.08; // tiny gap between cues
  const usable = Math.max(0.5, total - gap * (cueTexts.length - 1));

  const minDur = 1.2;
  const maxDur = 6.0;

  const lines: string[] = [];
  let cursor = 0;
  cueTexts.forEach((cue, i) => {
    let dur = (weights[i] / totalWeight) * usable;
    dur = Math.max(minDur, Math.min(maxDur, dur));
    const start = cursor;
    let end = start + dur;
    if (i === cueTexts.length - 1) end = Math.min(total, end);
    lines.push(String(i + 1));
    lines.push(`${fmt(start)} --> ${fmt(end)}`);
    lines.push(cue);
    lines.push("");
    cursor = end + gap;
  });

  const blob = new Blob([lines.join("\n")], { type: "application/x-subrip;charset=utf-8" });
  saveAs(blob, `${base}-${stamp()}.srt`);
}

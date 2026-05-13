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

/**
 * Build .srt by chunking the text into ~6-word cues distributed evenly across `duration` seconds.
 * If duration is unknown, assumes 2.5s per cue.
 */
export function exportSrt(text: string, duration: number | undefined, base = "subtitles") {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const chunkSize = 6;
  const cues: string[][] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    cues.push(words.slice(i, i + chunkSize));
  }
  const total = duration && duration > 0 ? duration : cues.length * 2.5;
  const per = total / cues.length;
  const lines: string[] = [];
  cues.forEach((c, i) => {
    const start = i * per;
    const end = Math.min(total, (i + 1) * per);
    lines.push(String(i + 1));
    lines.push(`${fmt(start)} --> ${fmt(end)}`);
    lines.push(c.join(" "));
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "application/x-subrip;charset=utf-8" });
  saveAs(blob, `${base}-${stamp()}.srt`);
}

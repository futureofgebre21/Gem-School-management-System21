import ExcelJS from "exceljs";
import type { ParsedQuestion } from "./types";

const HEADER_MAP: Record<string, string> = {
  subject: "subject_name",
  subject_name: "subject_name",
  grade: "grade_level",
  grade_level: "grade_level",
  gradelevel: "grade_level",
  question: "question_text",
  question_text: "question_text",
  questiontext: "question_text",
  option_a: "option_a", optiona: "option_a", "option a": "option_a", a: "option_a",
  option_b: "option_b", optionb: "option_b", "option b": "option_b", b: "option_b",
  option_c: "option_c", optionc: "option_c", "option c": "option_c", c: "option_c",
  option_d: "option_d", optiond: "option_d", "option d": "option_d", d: "option_d",
  correct_answer: "correct_answer", correctanswer: "correct_answer", correct: "correct_answer", answer: "correct_answer",
  explanation: "explanation",
  difficulty: "difficulty_level",
  difficulty_level: "difficulty_level",
  difficultylevel: "difficulty_level",
};

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, "");
  return HEADER_MAP[key] || key;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const counts = {
    "\t": (firstLine.match(/\t/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    ",": (firstLine.match(/,/g) || []).length,
  };
  if (counts["\t"] >= counts[","] && counts["\t"] >= counts[";"] && counts["\t"] > 0) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

// RFC 4180-ish CSV parser: handles quoted fields, escaped quotes, embedded delimiters/newlines
function parseCSV(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === delim) { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

function validateRow(row: ParsedQuestion, existingTexts: Set<string>): string[] {
  const errors: string[] = [];
  if (!row.question_text?.trim()) errors.push("Missing question text");
  if (row.question_text && row.question_text.length > 4000) errors.push("Question text exceeds 4000 chars");
  if (!row.option_a?.trim()) errors.push("Missing Option A");
  if (!row.option_b?.trim()) errors.push("Missing Option B");
  if (!row.option_c?.trim()) errors.push("Missing Option C");
  if (!row.option_d?.trim()) errors.push("Missing Option D");
  if (!row.grade_level?.trim()) errors.push("Missing grade level");

  const ca = row.correct_answer?.toUpperCase();
  if (!ca || !["A", "B", "C", "D"].includes(ca)) {
    errors.push("Correct answer must be A, B, C, or D");
  }

  const dl = row.difficulty_level?.toLowerCase();
  if (dl && !["easy", "medium", "hard"].includes(dl)) {
    errors.push("Difficulty must be easy, medium, or hard");
  }

  const sig = row.question_text?.trim().toLowerCase();
  if (sig && existingTexts.has(sig)) {
    errors.push("Duplicate question in file");
  } else if (sig) {
    existingTexts.add(sig);
  }

  return errors;
}

function rowsToQuestions(rows: string[][]): ParsedQuestion[] {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  const seen = new Set<string>();
  const out: ParsedQuestion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const mapped: Record<string, string> = {};
    headers.forEach((h, idx) => {
      mapped[h] = String(r[idx] ?? "").trim();
    });
    const q: ParsedQuestion = {
      subject_name: mapped.subject_name || "",
      grade_level: mapped.grade_level || "",
      question_text: mapped.question_text || "",
      option_a: mapped.option_a || "",
      option_b: mapped.option_b || "",
      option_c: mapped.option_c || "",
      option_d: mapped.option_d || "",
      correct_answer: mapped.correct_answer || "",
      explanation: mapped.explanation || "",
      difficulty_level: mapped.difficulty_level || "medium",
      errors: [],
    };
    q.errors = validateRow(q, seen);
    out.push(q);
  }
  return out;
}

export async function parseExcelOrCSV(buffer: ArrayBuffer, fileName: string): Promise<ParsedQuestion[]> {
  const isCSV = /\.csv$/i.test(fileName);
  if (isCSV) {
    const text = new TextDecoder("utf-8").decode(buffer);
    const delim = detectDelimiter(text);
    const rows = parseCSV(text, delim);
    return rowsToQuestions(rows);
  }
  // XLSX/XLS via exceljs
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const arr: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      if (v == null) arr.push("");
      else if (typeof v === "object" && "text" in (v as any)) arr.push(String((v as any).text ?? ""));
      else if (typeof v === "object" && "result" in (v as any)) arr.push(String((v as any).result ?? ""));
      else arr.push(String(v));
    });
    rows.push(arr);
  });
  return rowsToQuestions(rows);
}

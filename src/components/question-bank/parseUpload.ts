import * as XLSX from "xlsx";
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
  option_a: "option_a",
  optiona: "option_a",
  "option a": "option_a",
  a: "option_a",
  option_b: "option_b",
  optionb: "option_b",
  "option b": "option_b",
  b: "option_b",
  option_c: "option_c",
  optionc: "option_c",
  "option c": "option_c",
  c: "option_c",
  option_d: "option_d",
  optiond: "option_d",
  "option d": "option_d",
  d: "option_d",
  correct_answer: "correct_answer",
  correctanswer: "correct_answer",
  correct: "correct_answer",
  answer: "correct_answer",
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
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) return "\t";
  if (semicolonCount > commaCount && semicolonCount > 0) return ";";
  return ",";
}

function validateRow(row: ParsedQuestion, existingTexts: Set<string>): string[] {
  const errors: string[] = [];
  if (!row.question_text?.trim()) errors.push("Missing question text");
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
    errors.push("Duplicate question");
  } else if (sig) {
    existingTexts.add(sig);
  }

  return errors;
}

export function parseExcelOrCSV(buffer: ArrayBuffer, fileName: string): ParsedQuestion[] {
  const isCSV = /\.csv$/i.test(fileName);

  let wb: XLSX.WorkBook;

  if (isCSV) {
    // Decode the buffer to text and detect delimiter manually
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(buffer);
    const delimiter = detectDelimiter(text);
    // Use XLSX with explicit FS (field separator)
    wb = XLSX.read(text, { type: "string", FS: delimiter });
  } else {
    wb = XLSX.read(buffer, { type: "array" });
  }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!raw.length) return [];

  const headers = Object.keys(raw[0]);
  const mapping: Record<string, string> = {};
  headers.forEach(h => {
    mapping[h] = normalizeHeader(h);
  });

  const seen = new Set<string>();

  return raw.map((row) => {
    const mapped: any = {};
    headers.forEach(h => {
      mapped[mapping[h]] = String(row[h] ?? "").trim();
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
    return q;
  });
}

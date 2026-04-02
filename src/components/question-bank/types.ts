export interface ParsedQuestion {
  id?: string;
  subject_name: string;
  subject_id?: string;
  grade_level: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  difficulty_level: string;
  errors: string[];
}

export interface QuestionForm {
  subject_id: string;
  grade_level: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  difficulty_level: string;
}

export const emptyForm: QuestionForm = {
  subject_id: "",
  grade_level: "",
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "",
  explanation: "",
  difficulty_level: "medium",
};

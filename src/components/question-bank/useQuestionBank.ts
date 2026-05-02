import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import type { QuestionForm, ParsedQuestion } from "./types";

const STAFF_ROLES = new Set([
  "super_admin",
  "school_admin",
  "teacher",
  "director",
  "vice_academic",
]);

const PAGE_SIZE = 50;

export function useQuestionBank(opts?: { page?: number; subjectId?: string; grade?: string; difficulty?: string; search?: string }) {
  const { user, schoolId, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isStaff = STAFF_ROLES.has(userRole ?? "");

  const page = opts?.page ?? 0;

  const { data: subjects } = useQuery({
    queryKey: ["subjects", schoolId],
    queryFn: async () => {
      const q = supabase.from("subjects").select("id,name");
      if (schoolId) q.eq("school_id", schoolId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: questionsPage, isLoading } = useQuery({
    queryKey: ["exam_questions", schoolId, page, opts?.subjectId, opts?.grade, opts?.difficulty, opts?.search],
    queryFn: async () => {
      let q = supabase
        .from("exam_questions_bank")
        .select("*, subjects(name)", { count: "exact" });
      if (schoolId) q = q.eq("school_id", schoolId);
      if (opts?.subjectId && opts.subjectId !== "all") q = q.eq("subject_id", opts.subjectId);
      if (opts?.grade && opts.grade !== "all") q = q.eq("grade_level", opts.grade);
      if (opts?.difficulty && opts.difficulty !== "all") q = q.eq("difficulty_level", opts.difficulty);
      if (opts?.search?.trim()) q = q.ilike("question_text", `%${opts.search.trim()}%`);
      const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    enabled: !!schoolId,
    placeholderData: (prev) => prev,
  });

  const questions = questionsPage?.rows;
  const totalCount = questionsPage?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const addQuestion = useMutation({
    mutationFn: async (form: QuestionForm) => {
      const { error } = await supabase.from("exam_questions_bank").insert({
        ...form,
        school_id: schoolId!,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_questions"] });
      toast({ title: "Question added successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...form }: QuestionForm & { id: string }) => {
      const { error } = await supabase.from("exam_questions_bank").update(form).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_questions"] });
      toast({ title: "Question updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_questions_bank").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_questions"] });
      toast({ title: "Question deleted" });
    },
  });

  const bulkInsert = useMutation({
    mutationFn: async (rows: ParsedQuestion[]) => {
      const mapped = rows.filter(r => r.errors.length === 0).map(r => ({
        subject_id: r.subject_id!,
        grade_level: r.grade_level,
        question_text: r.question_text,
        option_a: r.option_a,
        option_b: r.option_b,
        option_c: r.option_c,
        option_d: r.option_d,
        correct_answer: r.correct_answer.toUpperCase(),
        explanation: r.explanation || "",
        difficulty_level: r.difficulty_level?.toLowerCase() || "medium",
        school_id: schoolId!,
        created_by: user?.id,
      }));
      if (!mapped.length) throw new Error("No valid questions to import");
      // Insert in batches of 100
      for (let i = 0; i < mapped.length; i += 100) {
        const batch = mapped.slice(i, i + 100);
        const { error } = await supabase.from("exam_questions_bank").insert(batch);
        if (error) throw error;
      }
      return mapped.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["exam_questions"] });
      toast({ title: `${count} questions imported successfully` });
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  return { subjects, questions, isLoading, isStaff, schoolId, user, addQuestion, updateQuestion, deleteQuestion, bulkInsert };
}

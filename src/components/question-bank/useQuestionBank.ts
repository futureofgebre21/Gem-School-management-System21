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
    onError: (e: any) => toast({
      title: "Error",
      description: e.code === "23505" ? "This question already exists in the bank." : e.message,
      variant: "destructive",
    }),
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
        grade_level: r.grade_level.trim(),
        question_text: r.question_text.trim(),
        option_a: r.option_a.trim(),
        option_b: r.option_b.trim(),
        option_c: r.option_c.trim(),
        option_d: r.option_d.trim(),
        correct_answer: r.correct_answer.toUpperCase().trim(),
        explanation: (r.explanation || "").trim(),
        difficulty_level: (r.difficulty_level || "medium").toLowerCase().trim(),
        school_id: schoolId!,
        created_by: user?.id,
      }));
      if (!mapped.length) throw new Error("No valid questions to import");

      const BATCH = 100;
      const PARALLEL = 4;
      let inserted = 0;
      let duplicates = 0;
      const batches: typeof mapped[] = [];
      for (let i = 0; i < mapped.length; i += BATCH) batches.push(mapped.slice(i, i + BATCH));

      for (let i = 0; i < batches.length; i += PARALLEL) {
        const slice = batches.slice(i, i + PARALLEL);
        const results = await Promise.all(slice.map(async (batch) => {
          const { data, error } = await supabase
            .from("exam_questions_bank")
            .insert(batch)
            .select("id");
          if (!error) return { ok: data?.length ?? 0, dup: 0 };
          if ((error as any).code !== "23505") throw error;
          // One row in this batch is a duplicate — retry per-row to count precisely
          let ok = 0, dup = 0;
          for (const row of batch) {
            const r = await supabase.from("exam_questions_bank").insert(row).select("id");
            if (!r.error) ok++;
            else if ((r.error as any).code === "23505") dup++;
            else throw r.error;
          }
          return { ok, dup };
        }));
        for (const r of results) { inserted += r.ok; duplicates += r.dup; }
      }

      return { inserted, duplicates, total: mapped.length };
    },
    onSuccess: ({ inserted, duplicates }) => {
      queryClient.invalidateQueries({ queryKey: ["exam_questions"] });
      toast({
        title: `${inserted} questions imported`,
        description: duplicates > 0 ? `${duplicates} duplicate(s) skipped` : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  return {
    subjects,
    questions,
    totalCount,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
    isLoading,
    isStaff,
    schoolId,
    user,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    bulkInsert,
  };
}


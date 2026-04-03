import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import GradeSelection from "@/components/exam-practice/GradeSelection";
import SubjectSelection from "@/components/exam-practice/SubjectSelection";
import ExamEngine from "@/components/exam-practice/ExamEngine";
import ExamResults from "@/components/exam-practice/ExamResults";

type View = "grade" | "subject" | "taking" | "result";

const STORAGE_KEY = "gem_exam_session";
const DEFAULT_TIME_MINUTES = 90;
const MAX_QUESTIONS = 50;

interface ResultData {
  correct: number;
  total: number;
  pct: number;
  questions: any[];
  answers: Record<string, string>;
}

interface ExamSession {
  attemptId: string;
  questions: any[];
  timeLeftSeconds: number;
  answers: Record<string, string>;
}

export default function ExamPractice() {
  const { user, schoolId, userRole } = useAuth();
  const [view, setView] = useState<View>("grade");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // Resume in-progress attempt on mount
  useEffect(() => {
    const resumeSession = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        // Check if attempt is still in_progress
        const { data: attempt } = await supabase
          .from("exam_attempts")
          .select("*, exams(exam_title, subject_id, subjects(name), grade_level)")
          .eq("id", parsed.attemptId)
          .eq("status", "in_progress")
          .single();

        if (!attempt) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Fetch questions
        const { data: questionRows } = await supabase
          .from("exam_questions_bank")
          .select("*")
          .in("id", parsed.questionIds);

        if (!questionRows?.length) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Preserve original order
        const ordered = parsed.questionIds
          .map((id: string) => questionRows.find((q: any) => q.id === id))
          .filter(Boolean);

        setSubjectName((attempt as any).exams?.subjects?.name || "Exam");
        setSelectedGrade((attempt as any).exams?.grade_level || "");
        setSession({
          attemptId: parsed.attemptId,
          questions: ordered,
          timeLeftSeconds: parsed.timeLeft,
          answers: parsed.answers || {},
        });
        setView("taking");
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    resumeSession();
  }, []);

  // Get student record
  const getStudentRecord = useCallback(async () => {
    if (!schoolId || !user) return null;
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .limit(200);
    return data?.find((s) => user.email === `student_${s.id}@gemschool.internal`) || null;
  }, [schoolId, user]);

  const handleGradeSelect = (grade: string) => {
    setSelectedGrade(grade);
    setView("subject");
  };

  const handleStartExam = async (subjectId: string, name: string, questionCount: number) => {
    const studentRecord = await getStudentRecord();
    if (!studentRecord && userRole === "student") {
      toast({ title: "Student record not found", variant: "destructive" });
      return;
    }

    // Fetch random questions
    const limit = Math.min(questionCount, MAX_QUESTIONS);
    const { data: questions, error } = await supabase
      .from("exam_questions_bank")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty_level")
      .eq("school_id", schoolId!)
      .eq("subject_id", subjectId)
      .eq("grade_level", selectedGrade)
      .limit(limit);

    if (error || !questions?.length) {
      toast({ title: "No questions available", variant: "destructive" });
      return;
    }

    // Shuffle
    const shuffled = questions.sort(() => Math.random() - 0.5);

    // Create attempt
    const studentId = studentRecord?.id || user!.id;
    const { data: attempt, error: aErr } = await supabase
      .from("exam_attempts")
      .insert({
        school_id: schoolId!,
        student_id: studentId,
        exam_id: subjectId, // Using subject as reference for practice mode
        total_questions: shuffled.length,
      })
      .select()
      .single();

    if (aErr) {
      toast({ title: "Error starting exam", description: aErr.message, variant: "destructive" });
      return;
    }

    setSubjectName(name);
    setSession({
      attemptId: attempt.id,
      questions: shuffled,
      timeLeftSeconds: DEFAULT_TIME_MINUTES * 60,
      answers: {},
    });
    setView("taking");
  };

  const handleFinish = (result: ResultData) => {
    setResultData(result);
    setView("result");
  };

  const handleBackToExams = () => {
    setView("grade");
    setSelectedGrade("");
    setSubjectName("");
    setSession(null);
    setResultData(null);
  };

  if (view === "grade") {
    return <GradeSelection onSelect={handleGradeSelect} />;
  }

  if (view === "subject") {
    return (
      <SubjectSelection
        grade={selectedGrade}
        schoolId={schoolId!}
        onBack={() => setView("grade")}
        onStart={handleStartExam}
      />
    );
  }

  if (view === "taking" && session) {
    return (
      <ExamEngine
        session={session}
        subjectName={subjectName}
        grade={selectedGrade}
        onFinish={handleFinish}
      />
    );
  }

  if (view === "result" && resultData) {
    return (
      <ExamResults
        {...resultData}
        subjectName={subjectName}
        grade={selectedGrade}
        onBackToExams={handleBackToExams}
      />
    );
  }

  return null;
}

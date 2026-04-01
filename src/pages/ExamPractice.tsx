import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Clock, Play, CheckCircle, XCircle, ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ExamView = "list" | "taking" | "result";

export default function ExamPractice() {
  const { user, schoolId, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ExamView>("list");
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [currentAttempt, setCurrentAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [resultData, setResultData] = useState<any>(null);

  // Get student record
  const { data: studentRecord } = useQuery({
    queryKey: ["my_student_record", user?.id, schoolId],
    queryFn: async () => {
      // Find student by looking up the deterministic email pattern
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", schoolId!)
        .limit(100);
      if (error) throw error;
      // For student role, find their record (match by created auth)
      return data?.find(s => {
        const testEmail = `student_${s.id}@gemschool.internal`;
        return user?.email === testEmail;
      }) || data?.[0] || null;
    },
    enabled: !!schoolId && userRole === "student",
  });

  // Published exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ["published_exams", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, subjects(name)")
        .eq("school_id", schoolId!)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Exam history
  const { data: attempts } = useQuery({
    queryKey: ["my_attempts", studentRecord?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*, exams(exam_title, subjects(name))")
        .eq("student_id", studentRecord!.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentRecord?.id,
  });

  // Timer
  useEffect(() => {
    if (view !== "taking" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view, timeLeft]);

  const startExam = async (exam: any) => {
    if (!studentRecord) {
      toast({ title: "Student record not found", variant: "destructive" });
      return;
    }

    // Fetch questions for this exam
    const { data: links, error: linkErr } = await supabase
      .from("exam_question_links")
      .select("*, exam_questions_bank(*)")
      .eq("exam_id", exam.id)
      .order("question_order");

    if (linkErr || !links?.length) {
      toast({ title: "No questions available for this exam", variant: "destructive" });
      return;
    }

    // Create attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .insert({
        school_id: schoolId!,
        student_id: studentRecord.id,
        exam_id: exam.id,
        total_questions: links.length,
      })
      .select()
      .single();

    if (attemptErr) {
      toast({ title: "Error starting exam", description: attemptErr.message, variant: "destructive" });
      return;
    }

    setCurrentExam(exam);
    setCurrentAttempt(attempt);
    setQuestions(links.map(l => (l as any).exam_questions_bank));
    setCurrentIdx(0);
    setAnswers({});
    setTimeLeft(exam.time_limit_minutes * 60);
    setView("taking");
  };

  const handleSubmit = useCallback(async () => {
    if (!currentAttempt || !questions.length) return;

    let correct = 0;
    const answerRows = questions.map(q => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) correct++;
      return {
        attempt_id: currentAttempt.id,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
      };
    });

    // Insert answers
    await supabase.from("exam_student_answers").insert(answerRows);

    const pct = Math.round((correct / questions.length) * 100);

    // Update attempt
    await supabase.from("exam_attempts").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      score: correct,
      percentage: pct,
    }).eq("id", currentAttempt.id);

    // Insert result summary
    await supabase.from("exam_results_summary").insert({
      school_id: schoolId!,
      student_id: currentAttempt.student_id,
      exam_id: currentAttempt.exam_id,
      total_correct: correct,
      total_wrong: questions.length - correct,
      percentage: pct,
    });

    setResultData({ correct, total: questions.length, pct });
    setView("result");
    queryClient.invalidateQueries({ queryKey: ["my_attempts"] });
  }, [currentAttempt, questions, answers, schoolId, queryClient]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Taking Exam View
  if (view === "taking" && questions.length) {
    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">{currentExam?.exam_title}</h2>
          <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="text-base px-3 py-1">
            <Clock className="w-4 h-4 mr-1" />{formatTime(timeLeft)}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">Question {currentIdx + 1} of {questions.length}</p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-relaxed">{q.question_text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["A", "B", "C", "D"].map(opt => {
              const text = q[`option_${opt.toLowerCase()}`];
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="font-semibold mr-3">{opt}.</span>{text}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />Previous
          </Button>
          {currentIdx < questions.length - 1 ? (
            <Button onClick={() => setCurrentIdx(i => i + 1)}>
              Next<ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} variant="default">Submit Exam</Button>
          )}
        </div>
      </div>
    );
  }

  // Result View
  if (view === "result" && resultData) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="text-center">
          <CardHeader>
            <Trophy className="w-16 h-16 mx-auto text-primary mb-2" />
            <CardTitle className="text-2xl">Exam Completed!</CardTitle>
            <CardDescription>{currentExam?.exam_title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-5xl font-bold text-primary">{resultData.pct}%</div>
            <div className="flex justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>{resultData.correct} Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span>{resultData.total - resultData.correct} Wrong</span>
              </div>
            </div>
            <Progress value={resultData.pct} className="h-3" />

            {/* Review answers */}
            <div className="text-left space-y-3 mt-6">
              <h3 className="font-semibold">Review</h3>
              {questions.map((q, i) => {
                const selected = answers[q.id];
                const isCorrect = selected === q.correct_answer;
                return (
                  <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                    <p className="text-xs mt-1">
                      Your answer: <span className="font-semibold">{selected || "Not answered"}</span>
                      {!isCorrect && <span className="ml-2">Correct: <span className="font-semibold text-primary">{q.correct_answer}</span></span>}
                    </p>
                    {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>}
                  </div>
                );
              })}
            </div>

            <Button onClick={() => { setView("list"); setCurrentExam(null); setResultData(null); }} className="w-full">
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam List View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Model Exam Practice</h1>
        <p className="text-sm text-muted-foreground">Practice exams and track your performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Loading exams...</p>
        ) : !exams?.length ? (
          <p className="text-muted-foreground col-span-full text-center py-8">No exams available yet.</p>
        ) : (
          exams.map(exam => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{exam.exam_title}</CardTitle>
                  <Badge variant={exam.exam_type === "model" ? "default" : "secondary"}>{exam.exam_type}</Badge>
                </div>
                <CardDescription>{(exam as any).subjects?.name} · {exam.grade_level}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{exam.total_questions} Qs</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.time_limit_minutes} min</span>
                </div>
                {userRole === "student" && (
                  <Button className="w-full" onClick={() => startExam(exam)}>
                    <Play className="w-4 h-4 mr-2" />Start Exam
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Exam History */}
      {userRole === "student" && attempts?.length ? (
        <Card>
          <CardHeader><CardTitle>Exam History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{(a as any).exams?.exam_title}</TableCell>
                    <TableCell>{(a as any).exams?.subjects?.name}</TableCell>
                    <TableCell>{a.score}/{a.total_questions}</TableCell>
                    <TableCell>
                      <Badge variant={Number(a.percentage) >= 50 ? "default" : "destructive"}>{a.percentage}%</Badge>
                    </TableCell>
                    <TableCell>{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

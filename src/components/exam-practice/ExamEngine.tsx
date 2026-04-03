import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import QuestionPalette from "./QuestionPalette";
import { useIsMobile } from "@/hooks/use-mobile";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  difficulty_level: string;
}

interface ExamSession {
  attemptId: string;
  questions: Question[];
  timeLeftSeconds: number;
  answers: Record<string, string>;
}

interface Props {
  session: ExamSession;
  subjectName: string;
  grade: string;
  onFinish: (result: {
    correct: number;
    total: number;
    pct: number;
    questions: Question[];
    answers: Record<string, string>;
  }) => void;
}

const STORAGE_KEY = "gem_exam_session";

export default function ExamEngine({ session, subjectName, grade, onFinish }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(session.answers);
  const [timeLeft, setTimeLeft] = useState(session.timeLeftSeconds);
  const [showPalette, setShowPalette] = useState(false);
  const isMobile = useIsMobile();
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Persist session to localStorage
  useEffect(() => {
    const data = {
      attemptId: session.attemptId,
      timeLeft,
      answers,
      questionIds: session.questions.map((q) => q.id),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [answers, timeLeft, session]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save answer to DB
  const saveAnswer = useCallback(
    async (questionId: string, selected: string) => {
      await supabase.from("exam_student_answers").upsert(
        {
          attempt_id: session.attemptId,
          question_id: questionId,
          selected_answer: selected,
          is_correct: session.questions.find((q) => q.id === questionId)?.correct_answer === selected,
        },
        { onConflict: "attempt_id,question_id" }
      );
    },
    [session]
  );

  const selectAnswer = (opt: string) => {
    const qId = session.questions[currentIdx].id;
    setAnswers((prev) => ({ ...prev, [qId]: opt }));
    saveAnswer(qId, opt);
  };

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const currentAnswers = answersRef.current;
    let correct = 0;
    const answerRows = session.questions.map((q) => {
      const selected = currentAnswers[q.id] || null;
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) correct++;
      return {
        attempt_id: session.attemptId,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
      };
    });

    // Upsert all answers
    await supabase.from("exam_student_answers").upsert(answerRows, {
      onConflict: "attempt_id,question_id",
    });

    const total = session.questions.length;
    const pct = Math.round((correct / total) * 100);

    await supabase
      .from("exam_attempts")
      .update({ status: "completed", completed_at: new Date().toISOString(), score: correct, percentage: pct })
      .eq("id", session.attemptId);

    localStorage.removeItem(STORAGE_KEY);

    onFinish({ correct, total, pct, questions: session.questions, answers: currentAnswers });
  }, [session, onFinish]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const q = session.questions[currentIdx];
  const progress = ((currentIdx + 1) / session.questions.length) * 100;
  const unansweredCount = session.questions.filter((qq) => !answers[qq.id]).length;
  const questionIds = session.questions.map((qq) => qq.id);

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Sticky Timer Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border py-3 -mx-4 px-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{subjectName}</span> · {grade}
          </div>
          <Badge
            variant={timeLeft < 300 ? "destructive" : "secondary"}
            className="text-base px-3 py-1 font-mono"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            {formatTime(timeLeft)}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Question {currentIdx + 1} of {session.questions.length}
            </p>
            {isMobile && (
              <Button variant="outline" size="sm" onClick={() => setShowPalette(!showPalette)}>
                {showPalette ? "Hide" : "Palette"}
              </Button>
            )}
          </div>

          {/* Mobile palette */}
          {isMobile && showPalette && (
            <Card className="p-3">
              <QuestionPalette
                total={session.questions.length}
                currentIdx={currentIdx}
                answers={answers}
                questionIds={questionIds}
                onJump={(i) => { setCurrentIdx(i); setShowPalette(false); }}
              />
            </Card>
          )}

          {/* Question */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base leading-relaxed">{q.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const text = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(opt)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-current text-xs font-bold mr-3">
                      {opt}
                    </span>
                    {text}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pb-6">
            <Button
              variant="outline"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {currentIdx < session.questions.length - 1 ? (
              <Button onClick={() => setCurrentIdx((i) => i + 1)}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default">
                    <Send className="w-4 h-4 mr-1" />
                    Submit Exam
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {unansweredCount > 0
                        ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Are you sure you want to submit?`
                        : "Are you sure you want to submit your exam?"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Desktop Sidebar Palette */}
        {!isMobile && (
          <div className="w-56 shrink-0">
            <div className="sticky top-24 space-y-4">
              <QuestionPalette
                total={session.questions.length}
                currentIdx={currentIdx}
                answers={answers}
                questionIds={questionIds}
                onJump={setCurrentIdx}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" className="w-full">
                    <Send className="w-4 h-4 mr-1" />
                    Submit Exam
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {unansweredCount > 0
                        ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Are you sure?`
                        : "Are you sure you want to submit your exam?"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

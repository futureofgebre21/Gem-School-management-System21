import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";

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

interface Props {
  correct: number;
  total: number;
  pct: number;
  questions: Question[];
  answers: Record<string, string>;
  subjectName: string;
  grade: string;
  onBackToExams: () => void;
}

export default function ExamResults({ correct, total, pct, questions, answers, subjectName, grade, onBackToExams }: Props) {
  const wrong = total - correct;
  const unanswered = questions.filter((q) => !answers[q.id]).length;

  const getOptionText = (q: Question, opt: string) => {
    const key = `option_${opt.toLowerCase()}` as keyof Question;
    return q[key] as string;
  };

  // Difficulty analysis
  const byDifficulty = questions.reduce(
    (acc, q) => {
      const d = q.difficulty_level || "medium";
      if (!acc[d]) acc[d] = { total: 0, correct: 0 };
      acc[d].total++;
      if (answers[q.id] === q.correct_answer) acc[d].correct++;
      return acc;
    },
    {} as Record<string, { total: number; correct: number }>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 pb-12">
      {/* Score Card */}
      <Card className="text-center">
        <CardHeader>
          <Trophy className={`w-16 h-16 mx-auto mb-2 ${pct >= 50 ? "text-primary" : "text-destructive"}`} />
          <CardTitle className="text-2xl">Exam Completed!</CardTitle>
          <CardDescription>{subjectName} · {grade}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`text-5xl font-bold ${pct >= 50 ? "text-primary" : "text-destructive"}`}>{pct}%</div>
          <div className="flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>{correct} Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span>{wrong} Wrong</span>
            </div>
            {unanswered > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span>{unanswered} Skipped</span>
              </div>
            )}
          </div>
          <Progress value={pct} className="h-3" />
          <p className="text-sm text-muted-foreground">
            Score: {correct} / {total}
          </p>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(byDifficulty).map(([level, stats]) => {
            const levelPct = Math.round((stats.correct / stats.total) * 100);
            return (
              <div key={level} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{level} Questions</span>
                  <span className="text-muted-foreground">
                    {stats.correct}/{stats.total} ({levelPct}%)
                  </span>
                </div>
                <Progress value={levelPct} className="h-2" />
              </div>
            );
          })}
          {pct < 50 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              💡 Recommendation: Practice more {subjectName} questions to improve your score.
            </div>
          )}
          {pct >= 50 && pct < 80 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700">
              💡 Good job! Focus on hard-difficulty questions to reach excellence.
            </div>
          )}
          {pct >= 80 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
              🎉 Excellent performance! Keep practicing to maintain your score.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, i) => {
            const selected = answers[q.id];
            const isCorrect = selected === q.correct_answer;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  !selected
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : isCorrect
                    ? "border-primary/30 bg-primary/5"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <p className="text-sm font-medium text-foreground">
                  {i + 1}. {q.question_text}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <p>
                    Your answer:{" "}
                    <span className="font-semibold">
                      {selected ? `${selected}. ${getOptionText(q, selected)}` : "Not answered"}
                    </span>
                  </p>
                  {!isCorrect && (
                    <p>
                      Correct answer:{" "}
                      <span className="font-semibold text-primary">
                        {q.correct_answer}. {getOptionText(q, q.correct_answer)}
                      </span>
                    </p>
                  )}
                </div>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground mt-2 italic border-t border-border pt-2">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={onBackToExams} className="w-full" size="lg">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Exams
      </Button>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Play } from "lucide-react";

const SUBJECT_ICONS: Record<string, string> = {
  mathematics: "📐", physics: "⚛️", chemistry: "🧪", biology: "🧬",
  english: "📖", aptitude: "🧠", geography: "🌍", history: "📜", economics: "📊",
};

interface Props {
  grade: string;
  schoolId: string;
  onBack: () => void;
  onStart: (subjectId: string, subjectName: string, questionCount: number) => void;
}

export default function SubjectSelection({ grade, schoolId, onBack, onStart }: Props) {
  const { data: subjectsWithCount, isLoading } = useQuery({
    queryKey: ["exam_subjects_count", schoolId, grade],
    queryFn: async () => {
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("school_id", schoolId);

      if (!subjects?.length) return [];

      const results = await Promise.all(
        subjects.map(async (sub) => {
          const { count } = await supabase
            .from("exam_questions_bank")
            .select("id", { count: "exact", head: true })
            .eq("school_id", schoolId)
            .eq("subject_id", sub.id)
            .eq("grade_level", grade);
          return { ...sub, questionCount: count || 0 };
        })
      );
      return results.filter((s) => s.questionCount > 0);
    },
    enabled: !!schoolId,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Select Subject</h1>
          <p className="text-sm text-muted-foreground">{grade} · Choose a subject to practice</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading subjects...</p>
      ) : !subjectsWithCount?.length ? (
        <p className="text-center text-muted-foreground py-12">No questions available for {grade} yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjectsWithCount.map((sub) => {
            const icon = SUBJECT_ICONS[sub.name.toLowerCase()] || "📚";
            return (
              <Card key={sub.id} className="hover:border-primary hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{sub.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        <span>{sub.questionCount} questions</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{grade}</Badge>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => onStart(sub.id, sub.name, sub.questionCount)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Practice Exam
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

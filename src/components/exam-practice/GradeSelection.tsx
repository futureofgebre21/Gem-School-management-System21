import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

const GRADES = [
  { label: "Grade 6", value: "Grade 6", description: "Primary School Exit Exam" },
  { label: "Grade 8", value: "Grade 8", description: "Middle School National Exam" },
  { label: "Grade 12", value: "Grade 12", description: "University Entrance Exam" },
];

interface Props {
  onSelect: (grade: string) => void;
}

export default function GradeSelection({ onSelect }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4">
      <div className="text-center space-y-2">
        <GraduationCap className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Select Your Grade</h1>
        <p className="text-muted-foreground">Choose the grade level for your practice exam</p>
      </div>
      <div className="grid gap-4">
        {GRADES.map((g) => (
          <Card
            key={g.value}
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all active:scale-[0.98]"
            onClick={() => onSelect(g.value)}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">{g.value.replace("Grade ", "")}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">{g.label}</h3>
                <p className="text-sm text-muted-foreground">{g.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

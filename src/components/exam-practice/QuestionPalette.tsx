import { cn } from "@/lib/utils";

interface Props {
  total: number;
  currentIdx: number;
  answers: Record<string, string>;
  questionIds: string[];
  onJump: (idx: number) => void;
}

export default function QuestionPalette({ total, currentIdx, answers, questionIds, onJump }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Question Palette</h3>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: total }, (_, i) => {
          const isAnswered = !!answers[questionIds[i]];
          const isCurrent = i === currentIdx;
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={cn(
                "w-9 h-9 rounded-lg text-xs font-semibold transition-all border",
                isCurrent
                  ? "bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md"
                  : isAnswered
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-muted border border-border" /> Not answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary" /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-400" /> Current
        </span>
      </div>
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuestionForm } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: QuestionForm;
  setForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  onSubmit: () => void;
  isPending: boolean;
  subjects: any[] | undefined;
  title: string;
  submitLabel: string;
}

export default function QuestionFormDialog({ open, onOpenChange, form, setForm, onSubmit, isPending, subjects, title, submitLabel }: Props) {
  const isValid = form.subject_id && form.question_text && form.correct_answer && form.option_a && form.option_b && form.option_c && form.option_d && form.grade_level;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grade Level</Label>
              <Input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} placeholder="e.g. Grade 9" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty_level} onValueChange={v => setForm(f => ({ ...f, difficulty_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Correct Answer</Label>
              <Select value={form.correct_answer} onValueChange={v => setForm(f => ({ ...f, correct_answer: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Question Text</Label>
            <Textarea value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Option A</Label><Input value={form.option_a} onChange={e => setForm(f => ({ ...f, option_a: e.target.value }))} /></div>
            <div><Label>Option B</Label><Input value={form.option_b} onChange={e => setForm(f => ({ ...f, option_b: e.target.value }))} /></div>
            <div><Label>Option C</Label><Input value={form.option_c} onChange={e => setForm(f => ({ ...f, option_c: e.target.value }))} /></div>
            <div><Label>Option D</Label><Input value={form.option_d} onChange={e => setForm(f => ({ ...f, option_d: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Explanation (optional)</Label>
            <Textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} rows={2} />
          </div>
          <Button onClick={onSubmit} disabled={!isValid || isPending}>
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

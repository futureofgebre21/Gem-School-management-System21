import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function QuestionBank() {
  const { user, schoolId, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const [form, setForm] = useState({
    subject_id: "",
    grade_level: "",
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "",
    explanation: "",
    difficulty_level: "medium",
  });

  const isStaff = userRole === "super_admin" || userRole === "school_admin" || userRole === "teacher";

  const { data: subjects } = useQuery({
    queryKey: ["subjects", schoolId],
    queryFn: async () => {
      const q = supabase.from("subjects").select("*");
      if (schoolId) q.eq("school_id", schoolId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["exam_questions", schoolId, filterSubject, filterDifficulty],
    queryFn: async () => {
      let q = supabase.from("exam_questions_bank").select("*, subjects(name)");
      if (schoolId) q = q.eq("school_id", schoolId);
      if (filterSubject !== "all") q = q.eq("subject_id", filterSubject);
      if (filterDifficulty !== "all") q = q.eq("difficulty_level", filterDifficulty);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exam_questions_bank").insert({
        ...form,
        school_id: schoolId!,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_questions"] });
      setOpen(false);
      setForm({ subject_id: "", grade_level: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "", explanation: "", difficulty_level: "medium" });
      toast({ title: "Question added successfully" });
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

  const filtered = questions?.filter(q =>
    q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyColor = (d: string) => {
    if (d === "easy") return "bg-green-100 text-green-800";
    if (d === "hard") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
          <p className="text-sm text-muted-foreground">Manage exam questions for model exams</p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Question</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Question</DialogTitle></DialogHeader>
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
                <Button onClick={() => addQuestion.mutate()} disabled={!form.subject_id || !form.question_text || !form.correct_answer || !form.option_a || !form.option_b || !form.option_c || !form.option_d || !form.grade_level}>
                  Save Question
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." className="pl-9" />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading questions...</p>
          ) : !filtered?.length ? (
            <p className="text-center text-muted-foreground py-8">No questions found. Add your first question!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Answer</TableHead>
                    {isStaff && <TableHead className="w-20">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(q => (
                    <TableRow key={q.id}>
                      <TableCell className="max-w-xs truncate">{q.question_text}</TableCell>
                      <TableCell>{(q as any).subjects?.name || "—"}</TableCell>
                      <TableCell>{q.grade_level}</TableCell>
                      <TableCell><Badge className={difficultyColor(q.difficulty_level)}>{q.difficulty_level}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{q.correct_answer}</Badge></TableCell>
                      {isStaff && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteQuestion.mutate(q.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

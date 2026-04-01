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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, BookOpen, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ExamManagement() {
  const { user, schoolId, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  const [form, setForm] = useState({
    exam_title: "",
    subject_id: "",
    grade_level: "",
    total_questions: 10,
    time_limit_minutes: 60,
    exam_type: "practice",
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

  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", schoolId],
    queryFn: async () => {
      let q = supabase.from("exams").select("*, subjects(name)");
      if (schoolId) q = q.eq("school_id", schoolId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: bankQuestions } = useQuery({
    queryKey: ["exam_questions_for_link", schoolId, selectedExam?.subject_id],
    queryFn: async () => {
      let q = supabase.from("exam_questions_bank").select("*");
      if (schoolId) q = q.eq("school_id", schoolId);
      if (selectedExam?.subject_id) q = q.eq("subject_id", selectedExam.subject_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && !!selectedExam,
  });

  const { data: linkedQuestions } = useQuery({
    queryKey: ["exam_question_links", selectedExam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_question_links")
        .select("*, exam_questions_bank(question_text)")
        .eq("exam_id", selectedExam.id)
        .order("question_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExam?.id,
  });

  const createExam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exams").insert({
        ...form,
        school_id: schoolId!,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setOpen(false);
      setForm({ exam_title: "", subject_id: "", grade_level: "", total_questions: 10, time_limit_minutes: 60, exam_type: "practice" });
      toast({ title: "Exam created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("exams").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({ title: "Exam updated" });
    },
  });

  const deleteExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({ title: "Exam deleted" });
    },
  });

  const linkQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const order = (linkedQuestions?.length || 0) + 1;
      const { error } = await supabase.from("exam_question_links").insert({
        exam_id: selectedExam.id,
        question_id: questionId,
        question_order: order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_question_links"] });
      toast({ title: "Question linked" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unlinkQuestion = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("exam_question_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_question_links"] });
      toast({ title: "Question removed" });
    },
  });

  const linkedIds = new Set(linkedQuestions?.map(l => l.question_id) || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exam Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage model exams</p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Create Exam</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Exam</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div><Label>Exam Title</Label><Input value={form.exam_title} onChange={e => setForm(f => ({ ...f, exam_title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Grade Level</Label><Input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} placeholder="e.g. Grade 10" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Total Questions</Label><Input type="number" value={form.total_questions} onChange={e => setForm(f => ({ ...f, total_questions: parseInt(e.target.value) || 10 }))} /></div>
                  <div><Label>Time Limit (min)</Label><Input type="number" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: parseInt(e.target.value) || 60 }))} /></div>
                </div>
                <div>
                  <Label>Exam Type</Label>
                  <Select value={form.exam_type} onValueChange={v => setForm(f => ({ ...f, exam_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="model">Model</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createExam.mutate()} disabled={!form.exam_title || !form.subject_id || !form.grade_level}>Save Exam</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Exam Question Link Dialog */}
      <Dialog open={linkOpen} onOpenChange={v => { setLinkOpen(v); if (!v) setSelectedExam(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Questions — {selectedExam?.exam_title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Linked Questions ({linkedQuestions?.length || 0}/{selectedExam?.total_questions})</h3>
              {linkedQuestions?.length ? (
                <div className="space-y-2">
                  {linkedQuestions.map((lq, i) => (
                    <div key={lq.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                      <span>{i + 1}. {(lq as any).exam_questions_bank?.question_text?.slice(0, 60)}...</span>
                      <Button variant="ghost" size="icon" onClick={() => unlinkQuestion.mutate(lq.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No questions linked yet.</p>}
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Available Questions</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bankQuestions?.filter(q => !linkedIds.has(q.id)).map(q => (
                  <div key={q.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                    <span className="truncate mr-2">{q.question_text.slice(0, 60)}...</span>
                    <Button size="sm" variant="outline" onClick={() => linkQuestion.mutate(q.id)}><Plus className="w-3 h-3 mr-1" />Add</Button>
                  </div>
                ))}
                {!bankQuestions?.filter(q => !linkedIds.has(q.id)).length && (
                  <p className="text-sm text-muted-foreground">No more questions available for this subject.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>All Exams</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : !exams?.length ? (
            <p className="text-center text-muted-foreground py-8">No exams created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Published</TableHead>
                    {isStaff && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map(exam => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.exam_title}</TableCell>
                      <TableCell>{(exam as any).subjects?.name || "—"}</TableCell>
                      <TableCell>{exam.grade_level}</TableCell>
                      <TableCell><BookOpen className="w-3 h-3 inline mr-1" />{exam.total_questions}</TableCell>
                      <TableCell><Clock className="w-3 h-3 inline mr-1" />{exam.time_limit_minutes}m</TableCell>
                      <TableCell><Badge variant={exam.exam_type === "model" ? "default" : "secondary"}>{exam.exam_type}</Badge></TableCell>
                      <TableCell>
                        {isStaff ? (
                          <Switch checked={exam.is_published} onCheckedChange={v => togglePublish.mutate({ id: exam.id, published: v })} />
                        ) : (
                          <Badge variant={exam.is_published ? "default" : "outline"}>{exam.is_published ? "Yes" : "No"}</Badge>
                        )}
                      </TableCell>
                      {isStaff && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedExam(exam); setLinkOpen(true); }}>Questions</Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteExam.mutate(exam.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
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

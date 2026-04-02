import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Edit, Upload } from "lucide-react";
import { useQuestionBank } from "@/components/question-bank/useQuestionBank";
import QuestionFormDialog from "@/components/question-bank/QuestionFormDialog";
import BulkUploadDialog from "@/components/question-bank/BulkUploadDialog";
import { emptyForm } from "@/components/question-bank/types";
import type { QuestionForm } from "@/components/question-bank/types";

export default function QuestionBank() {
  const { subjects, questions, isLoading, isStaff, addQuestion, updateQuestion, deleteQuestion, bulkInsert } = useQuestionBank();

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState<QuestionForm>({ ...emptyForm });

  const filtered = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      if (filterSubject !== "all" && q.subject_id !== filterSubject) return false;
      if (filterDifficulty !== "all" && q.difficulty_level !== filterDifficulty) return false;
      if (filterGrade !== "all" && q.grade_level !== filterGrade) return false;
      if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questions, filterSubject, filterDifficulty, filterGrade, search]);

  const grades = useMemo(() => {
    if (!questions) return [];
    return [...new Set(questions.map(q => q.grade_level))].sort();
  }, [questions]);

  const openEdit = (q: any) => {
    setEditId(q.id);
    setForm({
      subject_id: q.subject_id,
      grade_level: q.grade_level,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      difficulty_level: q.difficulty_level,
    });
    setEditOpen(true);
  };

  const handleAdd = () => {
    addQuestion.mutate(form, { onSuccess: () => { setAddOpen(false); setForm({ ...emptyForm }); } });
  };

  const handleUpdate = () => {
    updateQuestion.mutate({ id: editId, ...form }, { onSuccess: () => { setEditOpen(false); setForm({ ...emptyForm }); } });
  };

  const difficultyColor = (d: string) => {
    if (d === "easy") return "bg-green-100 text-green-800";
    if (d === "hard") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Bank Manager</h1>
          <p className="text-sm text-muted-foreground">
            Upload, manage, and organize exam questions &middot; {questions?.length ?? 0} total questions
          </p>
        </div>
        {isStaff && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Bulk Upload
            </Button>
            <Button onClick={() => { setForm({ ...emptyForm }); setAddOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Add Question
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
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
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Grades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
          ) : !filtered.length ? (
            <p className="text-center text-muted-foreground py-8">No questions found. Upload questions or add them manually!</p>
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
                    {isStaff && <TableHead className="w-24">Actions</TableHead>}
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
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {/* Dialogs */}
      <QuestionFormDialog
        open={addOpen} onOpenChange={setAddOpen}
        form={form} setForm={setForm}
        onSubmit={handleAdd} isPending={addQuestion.isPending}
        subjects={subjects} title="Add New Question" submitLabel="Save Question"
      />
      <QuestionFormDialog
        open={editOpen} onOpenChange={setEditOpen}
        form={form} setForm={setForm}
        onSubmit={handleUpdate} isPending={updateQuestion.isPending}
        subjects={subjects} title="Edit Question" submitLabel="Update Question"
      />
      <BulkUploadDialog
        open={bulkOpen} onOpenChange={setBulkOpen}
        subjects={subjects}
        onImport={async (rows) => { await bulkInsert.mutateAsync(rows); }}
        isPending={bulkInsert.isPending}
      />
    </div>
  );
}

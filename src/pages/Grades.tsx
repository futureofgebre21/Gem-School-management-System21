import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Download, FileText, BarChart3 } from "lucide-react";
import { Label } from "@/components/ui/label";

const GRADING_SCALES = [
  { value: "5", label: "Out of 5", max: 5 },
  { value: "10", label: "Out of 10", max: 10 },
  { value: "20", label: "Out of 20", max: 20 },
  { value: "40", label: "Out of 40", max: 40 },
  { value: "60", label: "Out of 60", max: 60 },
  { value: "100", label: "Out of 100", max: 100 },
];

function getGradeFromPercentage(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "F";
}

function toPercentage(score: number, maxScore: number): number {
  return (score / maxScore) * 100;
}

function EnterGradesTab({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [term, setTerm] = useState("First Term");
  const [scale, setScale] = useState("100");
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const maxScore = GRADING_SCALES.find(s => s.value === scale)?.max ?? 100;

  useEffect(() => {
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    ]).then(([c, s, y]) => {
      setClasses(c.data ?? []);
      setSubjects(s.data ?? []);
      setYears(y.data ?? []);
    });
  }, [schoolId]);

  const fetchStudents = async () => {
    if (!classFilter || !subjectFilter || !yearFilter) return;
    setLoading(true);
    const { data } = await supabase.from("students")
      .select("id, first_name, last_name, student_id_number")
      .eq("school_id", schoolId).eq("status", "active").order("first_name");
    setStudents(data ?? []);

    const { data: existing } = await supabase.from("grades")
      .select("student_id, score")
      .eq("class_id", classFilter).eq("subject_id", subjectFilter)
      .eq("academic_year_id", yearFilter).eq("term", term).eq("school_id", schoolId);

    const sc: Record<string, string> = {};
    (existing ?? []).forEach(g => { sc[g.student_id] = String(g.score ?? ""); });
    setScores(sc);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [classFilter, subjectFilter, yearFilter, term]);

  const handleSave = async () => {
    setSaving(true);
    const records = students.filter(s => scores[s.id] !== undefined && scores[s.id] !== "").map(s => {
      const rawScore = parseFloat(scores[s.id]);
      const pct = toPercentage(rawScore, maxScore);
      return {
        student_id: s.id, subject_id: subjectFilter, class_id: classFilter,
        academic_year_id: yearFilter, school_id: schoolId, term,
        score: rawScore, grade: getGradeFromPercentage(pct), recorded_by: user?.id,
      };
    });
    const { error } = await supabase.from("grades").upsert(records, { onConflict: "student_id,subject_id,academic_year_id,term" });
    if (error) toast.error(error.message);
    else toast.success("Grades saved");
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <Label>Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subject</Label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Academic Year</Label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Scale</Label>
          <Select value={scale} onValueChange={setScale}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADING_SCALES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {students.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Grading: <span className="font-semibold text-foreground">Out of {maxScore}</span></p>
          <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Grades"}</Button>
        </div>
      )}

      {!classFilter || !subjectFilter || !yearFilter ? (
        <p className="text-center py-8 text-muted-foreground">Select class, subject, and academic year</p>
      ) : loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No students found</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Score (/{maxScore})</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(s => {
              const score = scores[s.id] ?? "";
              const numScore = parseFloat(score);
              const pct = !isNaN(numScore) && score !== "" ? toPercentage(numScore, maxScore) : NaN;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.student_id_number}</TableCell>
                  <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number" min="0" max={maxScore} className="w-20"
                      value={score}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= maxScore)) {
                          setScores({ ...scores, [s.id]: val });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {!isNaN(pct) ? <span className="font-medium">{pct.toFixed(1)}%</span> : "-"}
                  </TableCell>
                  <TableCell>
                    {!isNaN(pct) ? (
                      <Badge variant={pct >= 50 ? "default" : "destructive"}>{getGradeFromPercentage(pct)}</Badge>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ReportCardsTab({ schoolId }: { schoolId: string }) {
  const [classFilter, setClassFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [term, setTerm] = useState("First Term");
  const [classes, setClasses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    ]).then(([c, y]) => { setClasses(c.data ?? []); setYears(y.data ?? []); });
  }, [schoolId]);

  const generate = async () => {
    if (!classFilter || !yearFilter) { toast.error("Select class and year"); return; }
    setLoading(true);
    const { data, error } = await supabase.from("grades")
      .select("student_id, score, grade, subject_id, subjects(name), students(first_name, last_name, student_id_number)")
      .eq("class_id", classFilter).eq("academic_year_id", yearFilter).eq("term", term).eq("school_id", schoolId);

    if (error) { toast.error(error.message); setLoading(false); return; }

    const byStudent: Record<string, { name: string; id_number: string; subjects: { name: string; score: number; grade: string }[]; avg: number }> = {};
    (data ?? []).forEach((g: any) => {
      const key = g.student_id;
      if (!byStudent[key]) {
        byStudent[key] = {
          name: `${g.students?.first_name} ${g.students?.last_name}`,
          id_number: g.students?.student_id_number ?? "",
          subjects: [], avg: 0,
        };
      }
      byStudent[key].subjects.push({ name: g.subjects?.name ?? "", score: g.score, grade: g.grade });
    });

    Object.values(byStudent).forEach(s => {
      s.avg = s.subjects.length ? s.subjects.reduce((sum, sub) => sum + sub.score, 0) / s.subjects.length : 0;
    });

    setReport(Object.values(byStudent).sort((a, b) => b.avg - a.avg));
    setLoading(false);
  };

  const exportCSV = () => {
    if (!report.length) return;
    const allSubjects = [...new Set(report.flatMap(r => r.subjects.map(s => s.name)))];
    const headers = ["Student ID", "Name", ...allSubjects, "Average", "Grade"];
    const rows = report.map(r => {
      const subScores = allSubjects.map(sub => {
        const found = r.subjects.find(s => s.name === sub);
        return found ? found.score : "";
      });
      return [r.id_number, r.name, ...subScores, r.avg.toFixed(1), getGradeFromPercentage(r.avg)];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "report-cards.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <Label>Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Academic Year</Label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generate} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
        {report.length > 0 && <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export</Button>}
      </div>

      {report.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead><TableHead>Student ID</TableHead><TableHead>Name</TableHead>
              <TableHead>Subjects</TableHead><TableHead>Average</TableHead><TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-bold">{i + 1}</TableCell>
                <TableCell className="font-mono text-sm">{r.id_number}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm">{r.subjects.map(s => `${s.name}: ${s.score}`).join(", ")}</TableCell>
                <TableCell className="font-bold">{r.avg.toFixed(1)}</TableCell>
                <TableCell><Badge variant={r.avg >= 50 ? "default" : "destructive"}>{getGradeFromPercentage(r.avg)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function Grades() {
  const { schoolId } = useAuth();
  if (!schoolId) return <div className="text-center py-12 text-muted-foreground">No school assigned.</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Grades & Report Cards</h1>
        <p className="text-sm text-muted-foreground">Enter grades, generate report cards, and track performance</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Tabs defaultValue="enter">
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="enter"><FileText className="w-4 h-4 mr-1 hidden sm:inline" />Enter Grades</TabsTrigger>
              <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />Report Cards</TabsTrigger>
            </TabsList>
            <TabsContent value="enter"><EnterGradesTab schoolId={schoolId} /></TabsContent>
            <TabsContent value="reports"><ReportCardsTab schoolId={schoolId} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

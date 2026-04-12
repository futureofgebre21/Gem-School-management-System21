import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Download, FileText, BarChart3 } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
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

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function toPercentage(score: number, maxScore: number): number {
  return (score / maxScore) * 100;
}

function StudentGradesView({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user) return;
            const { data: students } = await supabase.from("students")
        .select("id").eq("school_id", schoolId).eq("user_id", user.id).eq("status", "active");

      const studentIds = (students ?? []).map(s => s.id);
      if (studentIds.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from("grades")
        .select("score, grade, term, subjects(name), academic_years(name), classes(name)")
        .eq("school_id", schoolId).in("student_id", studentIds)
        .order("created_at", { ascending: false });
      setGrades(data ?? []);
      setLoading(false);
    };
    fetchGrades();
  }, [schoolId, user]);

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading your results...</p>;
  if (grades.length === 0) return <p className="text-center py-8 text-muted-foreground">No grades recorded yet.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead><TableHead>Class</TableHead><TableHead>Year</TableHead>
          <TableHead>Term</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grades.map((g, i) => (
          <TableRow key={i}>
            <TableCell className="font-medium">{(g as any).subjects?.name ?? "-"}</TableCell>
            <TableCell>{(g as any).classes?.name ?? "-"}</TableCell>
            <TableCell>{(g as any).academic_years?.name ?? "-"}</TableCell>
            <TableCell>{g.term}</TableCell>
            <TableCell>{g.score}</TableCell>
            <TableCell><Badge variant={g.grade && g.grade <= "C" ? "default" : "destructive"}>{g.grade}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EnterGradesTab({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [term, setTerm] = useState("First Term");
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // 1. የየአንዳንዱ Assessment ከፍተኛ ውጤት (Max Scores) state
  const [maxScores, setMaxScores] = useState({
    quiz_1: 5, quiz_2: 5, assignment_1: 10, assignment_2: 10,
    project_lab: 10, activity: 5, homework: 5, mid_exam: 20, final_exam: 30
  });

  // 2. የተማሪዎች ዝርዝር ውጤት state
  const [scores, setScores] = useState<Record<string, any>>({});
  const [entrollmentsMap, setEntrollmentsMap] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).order("name"),
      supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    ]).then(([c, sec, s, y]) => {
      setClasses(c.data ?? []);
      setSections(sec.data ?? []);
      setSubjects(s.data ?? []);
      setYears(y.data ?? []);
    });
  }, [schoolId]);

  const filteredSections = sections.filter(s => s.class_id === classFilter);

  const fetchStudents = async () => {
    if (!classFilter || !subjectFilter || !yearFilter) return;
    setLoading(true);

    let assignQuery = supabase.from("entrollments")
      .select("id, student_id, students (id, first_name, last_name, student_id_number)")
      .eq("class_id", classFilter)
      .eq("academic_year_id", yearFilter)
      .eq("school_id", schoolId);
      
    if (sectionFilter && sectionFilter !== "all") assignQuery = assignQuery.eq("section_id", sectionFilter);

    const { data: assignments } = await assignQuery;

    const map: Record<string, string> = {};
    const finalStudents: any[] = [];

    (assignments ?? []).forEach((a: any) => {
      if (a.students) {
        map[a.student_id] = a.id; 
        finalStudents.push(a.students);
      }
    });

    setEntrollmentsMap(map);
    finalStudents.sort((a, b) => a.first_name.localeCompare(b.first_name));
    setStudents(finalStudents);

    // የነበረውን ዝርዝር ውጤት ከዳታቤዝ ማምጣት
    const { data: existing } = await supabase.from("grades")
      .select("*")
      .eq("class_id", classFilter).eq("subject_id", subjectFilter)
      .eq("academic_year_id", yearFilter).eq("term", term).eq("school_id", schoolId);
      
    const sc: Record<string, any> = {};
    (existing ?? []).forEach(g => { 
      sc[g.student_id] = {
        quiz_1: g.quiz_1 ?? "", quiz_2: g.quiz_2 ?? "",
        assignment_1: g.assignment_1 ?? "", assignment_2: g.assignment_2 ?? "",
        project_lab: g.project_lab ?? "", activity: g.activity ?? "",
        homework: g.homework ?? "", mid_exam: g.mid_exam ?? "", final_exam: g.final_exam ?? ""
      }; 
    });
    setScores(sc);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [classFilter, sectionFilter, subjectFilter, yearFilter, term]);

  // 3. ውጤት ሲሞላ የሚሰራው Logic (Negative እና ከ Max በላይ እንዳይሆን ይቆጣጠራል)
  const handleScoreChange = (studentId: string, field: string, value: string) => {
    let numValue = value === "" ? "" : parseFloat(value);
    const maxAllowed = (maxScores as any)[field];

    if (typeof numValue === "number") {
      if (numValue < 0) numValue = 0; // Negative መከልከል
      if (numValue > maxAllowed) numValue = maxAllowed; // ከ Max በላይ እንዳይሄድ መከልከል
    }

    setScores(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [field]: numValue }
    }));
  };

  // 4. Total ደምሮ የሚያወጣ ፈንክሽን (እየደመረ ይሄዳል)
  const calculateTotal = (studentId: string) => {
    const s = scores[studentId] || {};
    let total = 0;
    Object.keys(maxScores).forEach(key => {
      total += Number(s[key]) || 0;
    });
    return Math.min(total, 100); // አጠቃላይ ከ100 በላይ እንዳይሄድ
  };

    const handleSave = async () => {
    setSaving(true);
    try {
      // 1. መምህሩ ውጤት ያስገባላቸውን ተማሪዎች ብቻ መለየት
      const recordsToSave = students
        .filter(s => scores[s.id] && Object.keys(scores[s.id]).length > 0)
        .map(s => {
          const studentScores = scores[s.id];
          const total = calculateTotal(s.id);

          // 💡 መፍትሄ 1፡ Empty string ("") ወደ null የሚቀይር ፈንክሽን
          // ይህ PostgreSQL የ Type mismatch error እንዳያመጣ ይከላከላል
          const parseGrade = (val: any) => val === "" ? null : val;

          return {
            student_id: s.id, 
            entrollment_id: entrollmentsMap[s.id], 
            subject_id: subjectFilter, 
            class_id: classFilter,
            academic_year_id: yearFilter, 
            school_id: schoolId, 
            term,
            // የተስተካከለ የውጤት አሞላል
            quiz_1: parseGrade(studentScores.quiz_1),
            quiz_2: parseGrade(studentScores.quiz_2),
            assignment_1: parseGrade(studentScores.assignment_1),
            assignment_2: parseGrade(studentScores.assignment_2),
            project_lab: parseGrade(studentScores.project_lab),
            activity: parseGrade(studentScores.activity),
            homework: parseGrade(studentScores.homework),
            mid_exam: parseGrade(studentScores.mid_exam),
            final_exam: parseGrade(studentScores.final_exam),
            
            // 💡 መፍትሄ 2፡ `total_score` የነበረውን ወደ `score` ቀይረነዋል (ከሌላው ኮድህ ጋር እንዲገጥም)
            total_score: total, 
            grade: getGradeFromPercentage(total), 
            recorded_by: user?.id,
          };
        });

      // 2. የተሞላ አዲስ ዳታ ከሌለ ዝም ብሎ ወደ ዳታቤዝ እንዳይልከው ማገጃ
      if (recordsToSave.length === 0) {
        toast.info("ምንም የተሞላ አዲስ ውጤት የለም!");
        setSaving(false);
        return;
      }

      // 3. የተለዩትን ተማሪዎች ብቻ Save/Update ማድረግ
      const { error } = await supabase
        .from("grades")
        .upsert(recordsToSave, { onConflict: "grades_unique_key" });

      if (error) {
          // ችግር ካለ በቀላሉ Console ላይ እንድታየው ይረዳሃል
          console.error("Supabase Save Error:", error);
          toast.error(getUserFriendlyError(error));
      } else {
          toast.success("ውጤት በትክክል ተቀምጧል!");
      }
    } catch (err: any) { 
        toast.error(err.message); 
    } finally {
        setSaving(false);
    }
  };


  const scoreFields = [
    { key: "quiz_1", label: "Q1" }, { key: "quiz_2", label: "Q2" },
    { key: "assignment_1", label: "Ass 1" }, { key: "assignment_2", label: "Ass 2" },
    { key: "project_lab", label: "Proj/Lab" }, { key: "activity", label: "Act" },
    { key: "homework", label: "HW" }, { key: "mid_exam", label: "Mid" }, { key: "final_exam", label: "Final" }
  ];

  const totalMax = Object.values(maxScores).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <Label>Class *</Label>
          <Select value={classFilter} onValueChange={v => { setClassFilter(v); setSectionFilter(""); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subject *</Label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Academic Year *</Label>
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
      </div>

      {students.length > 0 && (
        <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
          <div className="text-sm">
            <span className="font-bold text-primary">Total Max Score Setup: </span> 
            <span className={totalMax !== 100 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
              {totalMax}/100%
            </span>
            {totalMax !== 100 && <span className="ml-2 text-xs text-red-500">(Must equal exactly 100)</span>}
          </div>
          <Button onClick={handleSave} disabled={saving || totalMax !== 100}>
            <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save All Grades"}
          </Button>
        </div>
      )}

      {!classFilter || !subjectFilter || !yearFilter ? (
        <p className="text-center py-8 text-muted-foreground">Select class, subject, and academic year</p>
      ) : loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No students assigned to this class.</p>
      ) : (
        <div className="overflow-x-auto w-full border rounded-md">
          <Table className="w-full min-w-[1000px]">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[150px] sticky left-0 bg-muted">Student Name</TableHead>
                {/* የ Max Score ማስተካከያዎች በ Header ላይ */}
                {scoreFields.map(field => (
                  <TableHead key={field.key} className="text-center px-1">
                    <div className="text-xs font-semibold mb-1">{field.label}</div>
                    <div className="flex items-center justify-center text-xs">
                      <span className="text-muted-foreground mr-1">Max:</span>
                      <Input 
                        type="number" 
                        className="w-12 h-6 px-1 text-xs text-center border-primary/30"
                        value={(maxScores as any)[field.key]}
                        onChange={e => setMaxScores({...maxScores, [field.key]: Number(e.target.value) || 0})}
                      />
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold sticky right-0 bg-muted">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => {
                const total = calculateTotal(s.id);
                return (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium sticky left-0 bg-background truncate max-w-[150px]" title={`${s.first_name} ${s.last_name}`}>
                      {s.first_name} {s.last_name}
                    </TableCell>
                    
                    {scoreFields.map(field => (
                      <TableCell key={field.key} className="p-1">
                        <Input 
                          type="number" 
                          min="0"
                          max={(maxScores as any)[field.key]}
                          className={`w-14 text-center mx-auto ${(scores[s.id]?.[field.key] !== "" && scores[s.id]?.[field.key] > 0) ? 'bg-green-50 dark:bg-green-900/20' : ''}`} 
                          placeholder="-"
                          value={scores[s.id]?.[field.key] ?? ""}
                          onChange={e => handleScoreChange(s.id, field.key, e.target.value)}
                        />
                      </TableCell>
                    ))}
                    
                    <TableCell className="text-center sticky right-0 bg-background font-bold text-primary">
                      {total.toFixed(1)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


function ReportCardsTab({ schoolId }: { schoolId: string }) {
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [term, setTerm] = useState("First Term");
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    ]).then(([c, sec, y]) => {
      setClasses(c.data ?? []); setSections(sec.data ?? []); setYears(y.data ?? []);
    });
  }, [schoolId]);

  const filteredSections = sections.filter(s => s.class_id === classFilter);

  const generate = async () => {
    if (!classFilter || !yearFilter) { toast.error("Select class and year"); return; }
    setLoading(true);

        let assignQuery = supabase.from("entrollments")
      .select("student_id")
      .eq("class_id", classFilter)
      .eq("academic_year_id", yearFilter)
      .eq("school_id", schoolId);
    if (sectionFilter && sectionFilter !== "all") assignQuery = assignQuery.eq("section_id", sectionFilter);

    const { data: assigns } = await assignQuery;
    const studentIds = (assigns ?? []).map(a => a.student_id);
    if (studentIds.length === 0) { setReport([]); setLoading(false); return; }

    const { data, error } = await supabase.from("grades")
      .select("student_id, score, grade, subject_id, subjects(name), students(first_name, last_name, student_id_number)")
      .eq("class_id", classFilter).eq("academic_year_id", yearFilter).eq("term", term).eq("school_id", schoolId)
      .in("student_id", studentIds);

    if (error) { toast.error(getUserFriendlyError(error)); setLoading(false); return; }

    const byStudent: Record<string, { name: string; id_number: string; subjects: { name: string; score: number; grade: string }[]; avg: number }> = {};
    (data ?? []).forEach((g: any) => {
      const key = g.student_id;
      if (!byStudent[key]) {
        byStudent[key] = { name: `${g.students?.first_name} ${g.students?.last_name}`, id_number: g.students?.student_id_number ?? "", subjects: [], avg: 0 };
      }
      byStudent[key].subjects.push({ name: g.subjects?.name ?? "", score: g.score, grade: g.grade });
    });
    Object.values(byStudent).forEach(s => {
      s.avg = s.subjects.length ? s.subjects.reduce((sum, sub) => sum + sub.score, 0) / s.subjects.length : 0;
    });
    const sorted = Object.values(byStudent).sort((a, b) => b.avg - a.avg);
    // Assign ranks
    sorted.forEach((s, i) => { (s as any).rank = i + 1; });
    setReport(sorted);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <Label>Class</Label>
          <Select value={classFilter} onValueChange={v => { setClassFilter(v); setSectionFilter(""); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year</Label>
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
        {report.length > 0 && (
          <ExportMenu
            title="Report Cards"
            headers={["Student ID", "Name", "Average", "Rank", "Grade"]}
            rows={report.map((r, i) => [r.id_number, r.name, r.avg.toFixed(1), (r as any).rank ?? i + 1, getGradeFromPercentage(r.avg)])}
            filename="report-cards"
          />
        )}
      </div>

      {report.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead><TableHead>Name</TableHead>
              <TableHead>Subjects</TableHead><TableHead className="text-right">Avg</TableHead><TableHead className="text-center">Rank</TableHead><TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{r.id_number}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm">{r.subjects.map(s => `${s.name}: ${s.score}`).join(", ")}</TableCell>
                <TableCell className="text-right font-bold">{r.avg.toFixed(1)}</TableCell>
                <TableCell className="text-center font-bold">{getOrdinal((r as any).rank ?? i + 1)}</TableCell>
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
  const { schoolId, userRole } = useAuth();
  if (!schoolId) return <div className="text-center py-12 text-muted-foreground">No school assigned.</div>;

  const isStudent = userRole === "student";

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{isStudent ? "My Results" : "Grades & Report Cards"}</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent ? "View your academic results" : "Enter grades, generate report cards by class and section"}
        </p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          {isStudent ? (
            <StudentGradesView schoolId={schoolId} />
          ) : (
            <Tabs defaultValue="enter">
              <TabsList className="grid grid-cols-2 w-full max-w-sm">
                <TabsTrigger value="enter"><FileText className="w-4 h-4 mr-1 hidden sm:inline" />Enter Grades</TabsTrigger>
                <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />Report Cards</TabsTrigger>
              </TabsList>
              <TabsContent value="enter"><EnterGradesTab schoolId={schoolId} /></TabsContent>
              <TabsContent value="reports"><ReportCardsTab schoolId={schoolId} /></TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

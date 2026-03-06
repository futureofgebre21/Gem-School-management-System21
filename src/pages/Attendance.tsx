import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserCog, Save, Download } from "lucide-react";
import { Label } from "@/components/ui/label";

// Student read-only view
function StudentAttendanceView({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data: students } = await supabase.from("students")
        .select("id").eq("school_id", schoolId).eq("status", "active");
      const studentIds = (students ?? []).map(s => s.id);
      if (studentIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase.from("student_attendance")
        .select("date, status, classes(name)")
        .eq("school_id", schoolId)
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .limit(50);
      setRecords(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [schoolId, user]);

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading your attendance...</p>;

  const stats = {
    present: records.filter(r => r.status === "present").length,
    absent: records.filter(r => r.status === "absent").length,
    late: records.filter(r => r.status === "late").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Present: {stats.present}</Badge>
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Absent: {stats.absent}</Badge>
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Late: {stats.late}</Badge>
      </div>
      {records.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No attendance records found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{(r as any).classes?.name ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "secondary"}>
                    {r.status === "present" ? "✅" : r.status === "absent" ? "❌" : "⏰"} {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function StudentAttendanceTab({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [classFilter, setClassFilter] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name")
      .then(({ data }) => setClasses(data ?? []));
  }, [schoolId]);

  const fetchStudents = async () => {
    if (!classFilter) return;
    setLoading(true);
    const { data: studentData } = await supabase.from("students")
      .select("id, first_name, last_name, student_id_number")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("first_name");

    const { data: assignments } = await supabase.from("student_classes")
      .select("student_id")
      .eq("class_id", classFilter)
      .eq("school_id", schoolId);

    const assignedIds = new Set((assignments ?? []).map(a => a.student_id));

    const finalStudents = assignedIds.size > 0
      ? (studentData ?? []).filter(s => assignedIds.has(s.id))
      : studentData ?? [];

    setStudents(finalStudents);

    const { data: existing } = await supabase.from("student_attendance")
      .select("student_id, status")
      .eq("school_id", schoolId)
      .eq("class_id", classFilter)
      .eq("date", date);

    const att: Record<string, string> = {};
    (existing ?? []).forEach(a => { att[a.student_id] = a.status; });
    finalStudents.forEach(s => { if (!att[s.id]) att[s.id] = "present"; });
    setAttendance(att);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [classFilter, date]);

  const handleSave = async () => {
    setSaving(true);
    const records = Object.entries(attendance).map(([student_id, status]) => ({
      student_id, class_id: classFilter, school_id: schoolId, date, status, recorded_by: user?.id,
    }));
    const { error } = await supabase.from("student_attendance").upsert(records, { onConflict: "student_id,date" });
    if (error) toast.error(getUserFriendlyError(error));
    else toast.success(`Attendance saved for ${records.length} students`);
    setSaving(false);
  };

  const stats = {
    present: Object.values(attendance).filter(s => s === "present").length,
    absent: Object.values(attendance).filter(s => s === "absent").length,
    late: Object.values(attendance).filter(s => s === "late").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label>Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {students.length > 0 && (
          <div className="flex items-end">
            <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Attendance"}</Button>
          </div>
        )}
      </div>

      {stats.present + stats.absent + stats.late > 0 && (
        <div className="flex gap-3">
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Present: {stats.present}</Badge>
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Absent: {stats.absent}</Badge>
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Late: {stats.late}</Badge>
        </div>
      )}

      {!classFilter ? (
        <p className="text-center py-8 text-muted-foreground">Select a class to take attendance</p>
      ) : loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading students...</p>
      ) : students.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No students found for this class</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.student_id_number}</TableCell>
                <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                <TableCell>
                  <Select value={attendance[s.id] ?? "present"} onValueChange={v => setAttendance({ ...attendance, [s.id]: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">✅ Present</SelectItem>
                      <SelectItem value="absent">❌ Absent</SelectItem>
                      <SelectItem value="late">⏰ Late</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function TeacherAttendanceTab({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    const { data: teacherData } = await supabase.from("teachers")
      .select("id, first_name, last_name").eq("school_id", schoolId).eq("status", "active").order("first_name");
    setTeachers(teacherData ?? []);

    const { data: existing } = await supabase.from("teacher_attendance")
      .select("teacher_id, status").eq("school_id", schoolId).eq("date", date);

    const att: Record<string, string> = {};
    (existing ?? []).forEach(a => { att[a.teacher_id] = a.status; });
    (teacherData ?? []).forEach(t => { if (!att[t.id]) att[t.id] = "present"; });
    setAttendance(att);
    setLoading(false);
  };

  useEffect(() => { fetchTeachers(); }, [schoolId, date]);

  const handleSave = async () => {
    setSaving(true);
    const records = Object.entries(attendance).map(([teacher_id, status]) => ({
      teacher_id, school_id: schoolId, date, status, recorded_by: user?.id,
    }));
    const { error } = await supabase.from("teacher_attendance").upsert(records, { onConflict: "teacher_id,date" });
    if (error) toast.error(getUserFriendlyError(error));
    else toast.success(`Teacher attendance saved`);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        {teachers.length > 0 && (
          <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}</Button>
        )}
      </div>
      {loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> :
        teachers.length === 0 ? <p className="text-center py-8 text-muted-foreground">No teachers found</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {teachers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.first_name} {t.last_name}</TableCell>
                  <TableCell>
                    <Select value={attendance[t.id] ?? "present"} onValueChange={v => setAttendance({ ...attendance, [t.id]: v })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">✅ Present</SelectItem>
                        <SelectItem value="absent">❌ Absent</SelectItem>
                        <SelectItem value="late">⏰ Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
    </div>
  );
}

function AttendanceReportsTab({ schoolId }: { schoolId: string }) {
  const [classFilter, setClassFilter] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name")
      .then(({ data }) => setClasses(data ?? []));
  }, [schoolId]);

  const generateReport = async () => {
    if (!classFilter) { toast.error("Select a class"); return; }
    setLoading(true);
    const { data, error } = await supabase.from("student_attendance")
      .select("student_id, status, date, students(first_name, last_name, student_id_number)")
      .eq("school_id", schoolId)
      .eq("class_id", classFilter)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");

    if (error) { toast.error(getUserFriendlyError(error)); setLoading(false); return; }

    const byStudent: Record<string, { name: string; id_number: string; present: number; absent: number; late: number; total: number }> = {};
    (data ?? []).forEach((r: any) => {
      const key = r.student_id;
      if (!byStudent[key]) {
        byStudent[key] = { name: `${r.students?.first_name} ${r.students?.last_name}`, id_number: r.students?.student_id_number ?? "", present: 0, absent: 0, late: 0, total: 0 };
      }
      byStudent[key][r.status as "present" | "absent" | "late"]++;
      byStudent[key].total++;
    });

    setReport(Object.values(byStudent));
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ["Student ID", "Name", "Present", "Absent", "Late", "Total", "Attendance %"];
    const rows = report.map(r => [r.id_number, r.name, r.present, r.absent, r.late, r.total, r.total ? ((r.present / r.total) * 100).toFixed(1) + "%" : "0%"]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "attendance-report.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <Label>Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" /></div>
        <div><Label>To</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" /></div>
        <Button onClick={generateReport} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
        {report.length > 0 && <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export</Button>}
      </div>

      {report.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Present</TableHead>
              <TableHead>Absent</TableHead><TableHead>Late</TableHead><TableHead>Attendance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{r.id_number}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-green-600">{r.present}</TableCell>
                <TableCell className="text-red-600">{r.absent}</TableCell>
                <TableCell className="text-yellow-600">{r.late}</TableCell>
                <TableCell>
                  <Badge variant={r.total && (r.present / r.total) >= 0.9 ? "default" : "destructive"}>
                    {r.total ? ((r.present / r.total) * 100).toFixed(1) : 0}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function Attendance() {
  const { schoolId, userRole } = useAuth();
  if (!schoolId) return <div className="text-center py-12 text-muted-foreground">No school assigned.</div>;

  const isStudent = userRole === "student";
  const isAdmin = userRole === "super_admin" || userRole === "school_admin";

  if (isStudent) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">My Attendance</h1>
          <p className="text-sm text-muted-foreground">View your attendance records</p>
        </div>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <StudentAttendanceView schoolId={schoolId} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Track daily student and teacher attendance</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Tabs defaultValue="students">
            <TabsList className={`grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"} w-full max-w-md`}>
              <TabsTrigger value="students"><Users className="w-4 h-4 mr-1 hidden sm:inline" />Students</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="teachers"><UserCog className="w-4 h-4 mr-1 hidden sm:inline" />Teachers</TabsTrigger>
              )}
              <TabsTrigger value="reports"><Download className="w-4 h-4 mr-1 hidden sm:inline" />Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="students"><StudentAttendanceTab schoolId={schoolId} /></TabsContent>
            {isAdmin && (
              <TabsContent value="teachers"><TeacherAttendanceTab schoolId={schoolId} /></TabsContent>
            )}
            <TabsContent value="reports"><AttendanceReportsTab schoolId={schoolId} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

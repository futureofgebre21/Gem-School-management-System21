import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, BookOpen, Calendar, Megaphone } from "lucide-react";

export default function ParentPortal() {
  const { user, schoolId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);

      // Get linked students
      const { data: links } = await supabase.from("parent_students")
        .select("student_id, students(id, first_name, last_name, student_id_number, class, section, status)")
        .eq("parent_id", user.id);

      const linkedStudents = (links ?? []).map((l: any) => l.students).filter(Boolean);
      setStudents(linkedStudents);

      if (linkedStudents.length > 0) {
  const studentIds = linkedStudents.map(s => s.id);

  // 1. መጀመሪያ የተማሪዎቹን የዘንድሮ ምዝገባ (Enrollments) እንፈልጋለን
  const { data: enrollments } = await supabase.from("enrollments")
    .select("id, student_id")
    .in("student_id", studentIds)
    .eq("status", "active");

  const enrollmentIds = (enrollments ?? []).map(e => e.id);

  if (enrollmentIds.length > 0) {
    // 2. አሁን ውጤቱን በ enrollment_id እንጠራለን
    const { data: gradeData } = await supabase.from("grades")
      .select("score, grade, term, subjects(name), enrollments(students(first_name, last_name))")
      .in("enrollment_id", enrollmentIds)
      .order("created_at", { ascending: false })
      .limit(50);
    setGrades(gradeData ?? []);

    // 3. መገኘቱንም በ enrollment_id እና በ attendance_date እንጠራለን
    const { data: attData } = await supabase.from("student_attendance")
      .select("attendance_date, status, enrollments(students(first_name, last_name))")
      .in("enrollment_id", enrollmentIds)
      .order("attendance_date", { ascending: false })
      .limit(30);
    setAttendance(attData ?? []);
  }
}


      // Get announcements for the school
      if (schoolId) {
        const { data: ann } = await supabase.from("announcements")
          .select("*")
          .eq("school_id", schoolId)
          .in("target_audience", ["all", "parents"])
          .order("created_at", { ascending: false })
          .limit(20);
        setAnnouncements(ann ?? []);
      }

      setLoading(false);
    };
    fetchData();
  }, [user, schoolId]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  if (students.length === 0) {
    return (
      <div className="text-center py-12 space-y-2 animate-fade-in">
        <Users className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">Welcome to the Parent Portal</h2>
        <p className="text-muted-foreground">No students are linked to your account yet. Please contact your school admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Parent Portal</h1>
        <p className="text-sm text-muted-foreground">View your children's progress</p>
      </div>

      {/* Student Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(s => (
          <Card key={s.id} className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{s.first_name} {s.last_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono">{s.student_id_number}</p>
              <p className="text-sm">Class: {s.class ?? "-"} {s.section && `(${s.section})`}</p>
              <Badge variant={s.status === "active" ? "default" : "secondary"} className="mt-1 capitalize">{s.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <Tabs defaultValue="grades">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="grades"><BookOpen className="w-4 h-4 mr-1 hidden sm:inline" />Grades</TabsTrigger>
              <TabsTrigger value="attendance"><Calendar className="w-4 h-4 mr-1 hidden sm:inline" />Attendance</TabsTrigger>
              <TabsTrigger value="announcements"><Megaphone className="w-4 h-4 mr-1 hidden sm:inline" />News</TabsTrigger>
            </TabsList>

            <TabsContent value="grades">
              {grades.length === 0 ? <p className="text-center py-6 text-muted-foreground">No grades yet</p> : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Term</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((g: any, i) => (
                      <TableRow key={i}>
                        <TableCell>{g.enrollments?.students?.first_name} {g.enrollments?.students?.last_name}</TableCell>
                        <TableCell>{g.subjects?.name}</TableCell>
                        <TableCell>{g.term}</TableCell>
                        <TableCell className="font-bold">{g.score}</TableCell>
                        <TableCell><Badge variant={g.score >= 50 ? "default" : "destructive"}>{g.grade}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="attendance">
              {attendance.length === 0 ? <p className="text-center py-6 text-muted-foreground">No attendance records</p> : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((a: any, i) => (
                      <TableRow key={i}>
                        <TableCell>{a.students?.first_name} {a.students?.last_name}</TableCell>
                        <TableCell>{a.date}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "present" ? "default" : a.status === "late" ? "secondary" : "destructive"} className="capitalize">
                            {a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="announcements">
              {announcements.length === 0 ? <p className="text-center py-6 text-muted-foreground">No announcements</p> : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <Card key={a.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                      </CardHeader>
                      <CardContent><p className="text-sm">{a.content}</p></CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

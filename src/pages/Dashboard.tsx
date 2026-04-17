import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserCog, School, TrendingUp, UserCheck, UserX,
  Copy, Plus, Calendar, Hash, FileUp, FileText, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import StudentLinker from "@/components/StudentLinker";
import { AddStafModal } from "@/components/AddStafModal"; 


export default function Dashboard() {
  const { user, schoolId, userRole } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0, maleStudents: 0, femaleStudents: 0 });
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; school_code: string | null } | null>(null);
  const [schoolStats, setSchoolStats] = useState<{ name: string; type: string; studentCount: number }[]>([]);

  // Student-specific state
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<{ present: number; absent: number; late: number; total: number }>({ present: 0, absent: 0, late: 0, total: 0 });
  const [linkedStudentId, setLinkedStudentId] = useState<string | null | undefined>(undefined);

const [attendanceDetails, setAttendanceDetails] = useState<any[]>([]);

const isSuperAdmin = userRole === "super_admin";
  const isStudent = userRole === "student";
  const isParent = userRole === "parent";
  const isTeacher = userRole === "teacher";
  
  // አዲስ ድርሻዎች
  const isDirector = userRole === "director";
  const isRecordOffice = userRole === "record_office";
  const isViceAdmin = userRole === "vice_admin";
  const isHR = userRole === "human_resource";
  const isCasher = userRole === "casher";
const isAdmin = userRole === "school_admin" || userRole === "super_admin" || userRole === "director";


  // ማንኛውም የአስተዳደር ስራ የሚሰራ ሰው (Quick Actions ለማሳየት)
  const canManageData = isDirector || isRecordOffice || isViceAdmin || userRole === "school_admin"|| userRole === "super_admin";

  // Check if student/parent has linked their profile
  useEffect(() => {
    if ((isStudent || isParent) && user) {
      supabase.from("profiles").select("linked_student_id").eq("id", user.id).single()
        .then(({ data }) => setLinkedStudentId(data?.linked_student_id ?? null));
    }
  }, [isStudent, isParent, user]);

  useEffect(() => {
    if ((isStudent || isParent) && linkedStudentId) {
      fetchStudentData();
    } else if (!isStudent && !isParent) {
      fetchStats();
    }
  }, [schoolId, userRole, linkedStudentId]);

 
const fetchStudentData = async () => {
  if (!user || !schoolId || !linkedStudentId) return;

  const studentIds = [linkedStudentId];

  const { data: grades } = await supabase.from("grades")
    .select(`
      grade, term, 
      quiz_1, quiz_2, assignment_1, assignment_2, 
      project_lab, activity, homework, mid_exam, final_exam,total_score,
      subjects(name)
    `) // 👈 ዝርዝር Columns እዚህ ተጨምረዋል
    .eq("school_id", schoolId)
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .limit(10);
  
  setStudentGrades(grades ?? []);
 



    
  // ... (get attendance )

  // 1. Attendance Query በዚህ ተተካ (date ተጨምሯል)
  const { data: att } = await supabase.from("student_attendance")
    .select("date, status")
    .in("student_id", studentIds)
    .order("date", { ascending: false }); // አዲሱ ቀን ከላይ እንዲሆን

  const attData = att ?? [];
  
  // 2. የዕለት ተዕለት ዝርዝሩን ወደ state ማስገባት
  setAttendanceDetails(attData);

  
  setStudentAttendance({
    present: attData.filter(a => a.status === "present").length,
    absent: attData.filter(a => a.status === "absent").length,
    late: attData.filter(a => a.status === "late").length,
    total: attData.length,
  });

  


    // Get school info
    const { data: school } = await supabase.from("schools").select("name, school_code").eq("id", schoolId).single();
    if (school) setSchoolInfo(school);
  };

  const fetchStats = async () => {
    const isSuperAdmin = userRole === "super_admin";

    if (schoolId && !isSuperAdmin) {
      const { data: school } = await supabase.from("schools").select("name, school_code").eq("id", schoolId).single();
      if (school) setSchoolInfo(school);
    }

    let studentQuery = supabase.from("students").select("id, gender", { count: "exact" });
    let teacherQuery = supabase.from("teachers").select("id", { count: "exact", head: true });

    if (!isSuperAdmin && schoolId) {
      studentQuery = studentQuery.eq("school_id", schoolId);
      teacherQuery = teacherQuery.eq("school_id", schoolId);
    }

    const schoolPromise = isSuperAdmin
      ? supabase.from("schools").select("id, name, type", { count: "exact" })
      : null;

    const [studentsRes, teachers, schoolsRes] = await Promise.all([
      studentQuery, teacherQuery, schoolPromise,
    ]);

    const studentData = studentsRes.data ?? [];
    setStats({
      students: studentsRes.count ?? studentData.length,
      teachers: teachers.count ?? 0,
      schools: schoolsRes?.count ?? 0,
      maleStudents: studentData.filter(s => s.gender === "male").length,
      femaleStudents: studentData.filter(s => s.gender === "female").length,
    });

    if (isSuperAdmin && schoolsRes?.data) {
      const schoolCounts: { name: string; type: string; studentCount: number }[] = [];
      for (const sch of schoolsRes.data) {
        const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", sch.id);
        schoolCounts.push({ name: sch.name, type: (sch as any).type ?? "private", studentCount: count ?? 0 });
      }
      setSchoolStats(schoolCounts);
    }
  };

  const copySchoolCode = () => {
    if (schoolInfo?.school_code) {
      navigator.clipboard.writeText(schoolInfo.school_code);
      toast.success("School code copied!");
    }
  };

  // Show linker for unlinked students/parents
  if ((isStudent || isParent) && linkedStudentId === null) {
    return <StudentLinker onLinked={() => setLinkedStudentId("refresh")} />;
  }

  // Still loading linked status
  if ((isStudent || isParent) && linkedStudentId === undefined) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (isStudent || isParent) {
    const attPct = studentAttendance.total > 0 ? ((studentAttendance.present / studentAttendance.total) * 100).toFixed(1) : "0";
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{schoolInfo?.name ?? (isParent ? "Parent Portal" : "Student Dashboard")}</h1>
          <p className="text-muted-foreground text-sm">{isParent ? "Your child's academic overview" : "Welcome back! Here's your academic overview."}</p>
        </div>

        {/* Attendance Summary */}
        <div className="grid grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Attendance Rate</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{attPct}%</div></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Days Present</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-success">{studentAttendance.present}</div></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Days Absent</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{studentAttendance.absent}</div></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Days Late</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-warning">{studentAttendance.late}</div></CardContent>
          </Card>
        
{/* ከ Attendance ሲታይ ቀኑንም አብሮ ማውጣት */}
<Card className="shadow-card mt-6">
  <CardHeader>
    <CardTitle className="text-lg flex items-center gap-2">
      <Calendar className="w-5 h-5" /> Attendance History
    </CardTitle>
  </CardHeader>
  <CardContent>
    {attendanceDetails.length === 0 ? (
      <p className="text-center py-4 text-muted-foreground">No attendance records yet.</p>
    ) : (
      <div className="max-h-64 overflow-y-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className= "w-1/2">Date</TableHead>
              <TableHead className= "w-1/2">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceDetails.map((record, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  
                  {new Date(record.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </TableCell>
                <TableCell>
                  
                  <Badge 
                    className={
                      record.status === 'present' ? 'bg-green-500 hover:bg-green-600' :
                      record.status === 'absent' ? 'bg-red-500 hover:bg-red-600' :
                      'bg-yellow-500 hover:bg-yellow-600'
                    }
                  >
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </CardContent>
</Card>

</div>
        {/* Recent Grades */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            {studentGrades.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No grades recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
  <TableRow className="bg-muted/50">
    <TableHead className="whitespace-nowrap">Subject</TableHead>
    <TableHead className="whitespace-nowrap">Term</TableHead>
    <TableHead className="whitespace-nowrap">Quiz 1 (5%)</TableHead>
    <TableHead className="whitespace-nowrap">Quiz 2 (5%)</TableHead>
    <TableHead className="whitespace-nowrap">Assignment 1 (10%)</TableHead>
    <TableHead className="whitespace-nowrap">Assignment 2 (10%)</TableHead>
    <TableHead className="whitespace-nowrap">Project_lab (10%)</TableHead>
    <TableHead className="whitespace-nowrap">Activity (5%)</TableHead>
    <TableHead className="whitespace-nowrap">HomeWork (5%)</TableHead>
    <TableHead className="whitespace-nowrap">Mid Exam (20%)</TableHead>
    <TableHead className="whitespace-nowrap">Final Exam (30%)</TableHead>
    <TableHead className="whitespace-nowrap text-blue-600 font-bold">Total (100%)</TableHead>
    <TableHead className="whitespace-nowrap">Grade</TableHead>
  </TableRow>
</TableHeader>

        <TableBody>
  {studentGrades.map((g, i) => (
    <TableRow key={i}>
      <TableCell className="font-medium">{(g as any).subjects?.name ?? "-"}</TableCell>
      <TableCell>{g.term}</TableCell>
      
      {/* ⚠️ እያንዳንዱ Column በትክክለኛው ቅደም ተከተል መቀመጥ አለበት */}
      <TableCell>{g.quiz_1 ?? "-"}</TableCell>
      <TableCell>{g.quiz_2 ?? "-"}</TableCell>
      <TableCell>{g.assignment_1 ?? "-"}</TableCell>
      <TableCell>{g.assignment_2 ?? "-"}</TableCell>
      <TableCell>{g.project_lab ?? "-"}</TableCell>
      <TableCell>{g.activity ?? "-"}</TableCell>
      <TableCell>{g.homework ?? "-"}</TableCell>
      <TableCell>{g.mid_exam ?? "-"}</TableCell>
      <TableCell>{g.final_exam ?? "-"}</TableCell>
      
      {/* ድምር ውጤት (ከዳታቤዝ የመጣው) */}
      <TableCell className="font-bold text-blue-600">{g.total_score ?? "-"}</TableCell>
      
      <TableCell>
        <Badge variant={g.grade && ["A", "B", "C"].includes(g.grade) ? "default" : "destructive"}>
          {g.grade ?? "C"}
        </Badge>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
       

              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* School Code Banner for admins */}
      {isAdmin && schoolInfo?.school_code && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Hash className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your School Code</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-primary">{schoolInfo.school_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground max-w-48">Share this code with teachers, students & parents to join</p>
              <Button variant="outline" size="sm" onClick={copySchoolCode} className="gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {schoolInfo ? schoolInfo.name : "Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm">Welcome to GemSIS – Ethiopia's Digital School</p>
      </div>

      {/* Stats Cards - hide student/teacher counts from teachers */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${userRole === "super_admin" ? "lg:grid-cols-5" : isTeacher ? "lg:grid-cols-2" : "lg:grid-cols-4"} gap-4`}>
        {!isTeacher && (
          <>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Students</CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{stats.students}</div></CardContent>
            </Card>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Male Students</CardTitle>
                <UserCheck className="w-4 h-4 text-info" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{stats.maleStudents}</div></CardContent>
            </Card>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Female Students</CardTitle>
                <UserX className="w-4 h-4 text-secondary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{stats.femaleStudents}</div></CardContent>
            </Card>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Teachers</CardTitle>
                <UserCog className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{stats.teachers}</div></CardContent>
            </Card>
          </>
        )}
        {isTeacher && (
          <>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">My Classes</CardTitle>
                <BarChart3 className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">—</div></CardContent>
            </Card>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Attendance Today</CardTitle>
                <Calendar className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">—</div></CardContent>
            </Card>
          </>
        )}
        {userRole === "super_admin" && (
          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Schools</CardTitle>
              <School className="w-4 h-4 text-info" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{stats.schools}</div></CardContent>
          </Card>
        )}
      </div>
  {/* Quick Actions - role filtered */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

  {/* ለዳይሬክተሩ ብቻ የሚታዩ የAdd Staff በተኖች */}
  {isDirector && (
    <>
      <AddStaffModal role="record_office" schoolId={schoolId!} />
      <AddStaffModal role="vice_admin" schoolId={schoolId!} />
      <AddStaffModal role="vice_academic" schoolId={schoolId!} />
    </>
  )}

  {/* ለቪፒ አድሚን ብቻ የሚታዩ የHR እና Casher በተኖች */}
  {isViceAdmin && (
    <>
      <AddStaffModal role="human_resource" schoolId={schoolId!} />
      <AddStaffModal role="casher" schoolId={schoolId!} />
    </>
  )}

  {/* ተማሪ መመዝገብ የሚችለው Record Office ብቻ ነው */}
  {(isRecordOffice) && (
    <Link to="/dashboard/students" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-center group">
      <Plus className="w-8 h-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
      <p className="text-sm font-medium">Add Student</p>
    </Link>
  )}

  {/* ክትትል ማየት ለሁሉም ሰራተኞች */}
  <Link to="/dashboard/attendance" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors text-center group">
    <Calendar className="w-8 h-8 mx-auto mb-2 text-secondary group-hover:scale-110 transition-transform" />
    <p className="text-sm font-medium">Attendance</p>
  </Link>

  {/* መምህራንን መቆጣጠር ለ HR  ብቻ */}
  {(isHR ) && (
    <Link to="/dashboard/teachers" className="p-4 rounded-lg bg-success/10 hover:bg-success/20 transition-colors text-center group">
      <UserCog className="w-8 h-8 mx-auto mb-2 text-success group-hover:scale-110 transition-transform" />
      <p className="text-sm font-medium">Manage Teachers</p>
    </Link>
  )}

  {/* ክፍያዎችን ማስተዳደር ለ Casher ብቻ */}
  {(isCasher) && (
    <Link to="/dashboard/finance" className="p-4 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors text-center group">
      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-warning group-hover:scale-110 transition-transform" />
      <p className="text-sm font-medium">Fee payments</p>
    </Link>
  )}
</div>


      



      {/* Super admin: per-school table */}
      {userRole === "super_admin" && schoolStats.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Students Per School</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolStats.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.type === "government" ? "secondary" : "default"} className="capitalize">
                        {s.type === "government" ? "🏛️" : "🏫"} {s.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{s.studentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

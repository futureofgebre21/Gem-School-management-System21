import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, School, TrendingUp, UserCheck, UserX } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { schoolId, userRole } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0, maleStudents: 0, femaleStudents: 0, maleTeachers: 0, femaleTeachers: 0 });
  const [schoolStats, setSchoolStats] = useState<{ name: string; type: string; studentCount: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const isSuperAdmin = userRole === "super_admin";

      let studentQuery = supabase.from("students").select("id, gender", { count: "exact" });
      let teacherQuery = supabase.from("teachers").select("id", { count: "exact", head: true });

      if (!isSuperAdmin && schoolId) {
        studentQuery = studentQuery.eq("school_id", schoolId);
        teacherQuery = teacherQuery.eq("school_id", schoolId);
      }

      const [studentsRes, teachers, schools] = await Promise.all([
        studentQuery,
        teacherQuery,
        supabase.from("schools").select("id, name, type", { count: "exact" }),
      ]);

      const studentData = studentsRes.data ?? [];
      const maleStudents = studentData.filter(s => s.gender === "male").length;
      const femaleStudents = studentData.filter(s => s.gender === "female").length;

      // Fetch teacher gender data for current school or all
      let teacherGenderQuery = supabase.from("students").select("id"); // placeholder
      // Teachers don't have gender column yet, so we'll skip gender for teachers
      
      setStats({
        students: studentsRes.count ?? studentData.length,
        teachers: teachers.count ?? 0,
        schools: schools.count ?? 0,
        maleStudents,
        femaleStudents,
        maleTeachers: 0,
        femaleTeachers: 0,
      });

      // School student counts (for super_admin)
      if (isSuperAdmin && schools.data) {
        const schoolCounts: { name: string; type: string; studentCount: number }[] = [];
        for (const sch of schools.data) {
          const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", sch.id);
          schoolCounts.push({ name: sch.name, type: (sch as any).type ?? "private", studentCount: count ?? 0 });
        }
        setSchoolStats(schoolCounts);
      }
    };
    fetchStats();
  }, [schoolId, userRole]);

  const cards = [
    { title: "Total Students", value: stats.students, icon: Users, color: "text-primary" },
    { title: "Male Students", value: stats.maleStudents, icon: UserCheck, color: "text-info" },
    { title: "Female Students", value: stats.femaleStudents, icon: UserX, color: "text-secondary" },
    { title: "Total Teachers", value: stats.teachers, icon: UserCog, color: "text-success" },
    { title: "Schools", value: stats.schools, icon: School, color: "text-info" },
    { title: "Active Rate", value: "98%", icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome to Gem School Management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-school student count table */}
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

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a href="/dashboard/students" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Students</p>
            </a>
            <a href="/dashboard/teachers" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors text-center">
              <UserCog className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-sm font-medium">Teachers</p>
            </a>
            <a href="/dashboard/schools" className="p-4 rounded-lg bg-info/10 hover:bg-info/20 transition-colors text-center">
              <School className="w-8 h-8 mx-auto mb-2 text-info" />
              <p className="text-sm font-medium">Schools</p>
            </a>
            <a href="/dashboard/fees" className="p-4 rounded-lg bg-success/10 hover:bg-success/20 transition-colors text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-sm font-medium">Fees</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

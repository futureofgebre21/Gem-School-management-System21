import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserCog, School, TrendingUp, UserCheck, UserX,
  Copy, Plus, Calendar, Hash, FileUp,
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { schoolId, userRole } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0, maleStudents: 0, femaleStudents: 0 });
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; school_code: string | null } | null>(null);
  const [schoolStats, setSchoolStats] = useState<{ name: string; type: string; studentCount: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const isSuperAdmin = userRole === "super_admin";

      // Fetch school info for admins
      if (schoolId && !isSuperAdmin) {
        const { data: school } = await supabase
          .from("schools")
          .select("name, school_code")
          .eq("id", schoolId)
          .single();
        if (school) setSchoolInfo(school);
      }

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
      setStats({
        students: studentsRes.count ?? studentData.length,
        teachers: teachers.count ?? 0,
        schools: schools.count ?? 0,
        maleStudents: studentData.filter(s => s.gender === "male").length,
        femaleStudents: studentData.filter(s => s.gender === "female").length,
      });

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

  const copySchoolCode = () => {
    if (schoolInfo?.school_code) {
      navigator.clipboard.writeText(schoolInfo.school_code);
      toast.success("School code copied!");
    }
  };

  const isAdmin = userRole === "school_admin" || userRole === "super_admin";

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
        <p className="text-muted-foreground text-sm">Welcome to Gem School Management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Schools</CardTitle>
            <School className="w-4 h-4 text-info" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{stats.schools}</div></CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/dashboard/students" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-center group">
              <Plus className="w-8 h-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Add Student</p>
            </Link>
            <Link to="/dashboard/attendance" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors text-center group">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-secondary group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">View Attendance</p>
            </Link>
            <Link to="/dashboard/teachers" className="p-4 rounded-lg bg-success/10 hover:bg-success/20 transition-colors text-center group">
              <UserCog className="w-8 h-8 mx-auto mb-2 text-success group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Manage Teachers</p>
            </Link>
            {isAdmin && (
              <Link to="/dashboard/import" className="p-4 rounded-lg bg-info/10 hover:bg-info/20 transition-colors text-center group">
                <FileUp className="w-8 h-8 mx-auto mb-2 text-info group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">Import Data</p>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

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

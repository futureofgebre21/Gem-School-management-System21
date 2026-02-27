import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, School, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { schoolId, userRole } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const isSuperAdmin = userRole === "super_admin";

      let studentQuery = supabase.from("students").select("id", { count: "exact", head: true });
      let teacherQuery = supabase.from("teachers").select("id", { count: "exact", head: true });

      if (!isSuperAdmin && schoolId) {
        studentQuery = studentQuery.eq("school_id", schoolId);
        teacherQuery = teacherQuery.eq("school_id", schoolId);
      }

      const [students, teachers, schools] = await Promise.all([
        studentQuery,
        teacherQuery,
        supabase.from("schools").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        schools: schools.count ?? 0,
      });
    };
    fetchStats();
  }, [schoolId, userRole]);

  const cards = [
    { title: "Total Students", value: stats.students, icon: Users, color: "text-primary" },
    { title: "Total Teachers", value: stats.teachers, icon: UserCog, color: "text-secondary" },
    { title: "Schools", value: stats.schools, icon: School, color: "text-info" },
    { title: "Active Rate", value: "98%", icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome to Gem School Management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="/dashboard/students" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Add Student</p>
            </a>
            <a href="/dashboard/teachers" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors text-center">
              <UserCog className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-sm font-medium">Add Teacher</p>
            </a>
            <a href="/dashboard/schools" className="p-4 rounded-lg bg-info/10 hover:bg-info/20 transition-colors text-center">
              <School className="w-8 h-8 mx-auto mb-2 text-info" />
              <p className="text-sm font-medium">Manage Schools</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

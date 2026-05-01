import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStaffModal } from "@/components/AddStaffModal";
import { Layers, Megaphone, Calendar, School } from "lucide-react";

export default function DirectorDashboard() {
  const { schoolId } = useAuth();

  if (!schoolId) {
    return (
      <Card className="max-w-xl mx-auto mt-10 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><School className="w-5 h-5" /> Create your school</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You don't have a school yet. Create one to start inviting your staff.
          </p>
          <Link to="/dashboard/schools" className="text-primary font-medium underline">
            Go to Schools →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Director Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage your school's leadership team and structure.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Staff Invitations</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AddStaffModal role="vice_academic" schoolId={schoolId} label="Add Vice Academic" />
          <AddStaffModal role="vice_admin" schoolId={schoolId} label="Add Vice Admin" />
          <AddStaffModal role="record_office" schoolId={schoolId} label="Add Record Office" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/dashboard/announcements" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 text-center">
          <Megaphone className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Announcements</p>
        </Link>
        <Link to="/dashboard/academics" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-center">
          <Layers className="w-8 h-8 mx-auto mb-2 text-secondary" />
          <p className="text-sm font-medium">Grade Structure</p>
        </Link>
        <Link to="/dashboard/attendance" className="p-4 rounded-lg bg-success/10 hover:bg-success/20 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="text-sm font-medium">Attendance (read-only)</p>
        </Link>
      </div>
    </div>
  );
}

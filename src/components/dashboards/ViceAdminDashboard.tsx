import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStaffModal } from "@/components/AddStaffModal";
import { Calendar } from "lucide-react";

export default function ViceAdminDashboard() {
  const { schoolId } = useAuth();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vice Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Hire support staff and monitor attendance.</p>
      </div>
      {schoolId && (
        <Card className="shadow-card">
          <CardHeader><CardTitle>Support Staff</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AddStaffModal role="human_resource" schoolId={schoolId} label="Add HR" />
            <AddStaffModal role="cashier" schoolId={schoolId} label="Add Cashier" />
          </CardContent>
        </Card>
      )}
      <Link to="/dashboard/attendance" className="block p-4 rounded-lg bg-success/10 hover:bg-success/20 text-center">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-success" />
        <p className="text-sm font-medium">Student & Teacher Attendance</p>
      </Link>
    </div>
  );
}

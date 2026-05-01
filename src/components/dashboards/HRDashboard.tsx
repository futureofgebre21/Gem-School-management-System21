import { Link } from "react-router-dom";
import { UserCog, Calendar } from "lucide-react";

export default function HRDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage teacher records and attendance.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/dashboard/teachers" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 text-center">
          <UserCog className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Add Teacher (with payroll)</p>
        </Link>
        <Link to="/dashboard/attendance" className="p-4 rounded-lg bg-success/10 hover:bg-success/20 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="text-sm font-medium">Teacher Attendance</p>
        </Link>
      </div>
    </div>
  );
}

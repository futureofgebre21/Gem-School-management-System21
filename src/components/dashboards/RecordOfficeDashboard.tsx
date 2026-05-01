import { Link } from "react-router-dom";
import { Users, UserCog, FileText } from "lucide-react";

export default function RecordOfficeDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Record Office Dashboard</h1>
        <p className="text-muted-foreground text-sm">Register students, teachers, and manage scores.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/dashboard/students" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Add Student</p>
        </Link>
        <Link to="/dashboard/teachers" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-center">
          <UserCog className="w-8 h-8 mx-auto mb-2 text-secondary" />
          <p className="text-sm font-medium">Add Teacher</p>
        </Link>
        <Link to="/dashboard/grades" className="p-4 rounded-lg bg-success/10 hover:bg-success/20 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="text-sm font-medium">Score Manager</p>
        </Link>
      </div>
    </div>
  );
}

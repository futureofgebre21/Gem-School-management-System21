import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText } from "lucide-react";

export default function ViceAcademicDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vice Academic Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage subject portions and review scores.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/dashboard/academics" className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Subject Portions</p>
        </Link>
        <Link to="/dashboard/grades" className="p-4 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-secondary" />
          <p className="text-sm font-medium">Score Viewer (read-only)</p>
        </Link>
      </div>
    </div>
  );
}

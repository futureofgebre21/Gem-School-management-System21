import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, UserCog,
  School, Menu, X, LogOut, ChevronDown, Layers,
  Calendar, FileText, Megaphone, Home, DollarSign, FileUp, BookOpen, ClipboardList, GraduationCap,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["super_admin", "school_admin", "teacher", "student", "parent"] },
  { to: "/dashboard/students", icon: Users, label: "Students", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/teachers", icon: UserCog, label: "Teachers", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/schools", icon: School, label: "Schools", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/academics", icon: Layers, label: "Academics", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/attendance", icon: Calendar, label: "Attendance", roles: ["super_admin", "school_admin", "teacher", "student"] },
  { to: "/dashboard/grades", icon: FileText, label: "Grades", roles: ["super_admin", "school_admin", "teacher", "student"] },
  { to: "/dashboard/fees", icon: DollarSign, label: "Fees", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/announcements", icon: Megaphone, label: "Announcements", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/parent", icon: Home, label: "Parent Portal", roles: ["parent"] },
  { to: "/dashboard/import", icon: FileUp, label: "Import Data", roles: ["super_admin", "school_admin"] },
  { to: "/dashboard/question-bank", icon: BookOpen, label: "Question Bank", roles: ["super_admin", "school_admin", "teacher"] },
  { to: "/dashboard/exam-management", icon: ClipboardList, label: "Exam Management", roles: ["super_admin", "school_admin", "teacher"] },
  { to: "/dashboard/exam-practice", icon: GraduationCap, label: "Model Exams", roles: ["super_admin", "school_admin", "teacher", "student"] },
  { to: "/dashboard/support", icon: HelpCircle, label: "Support", roles: ["super_admin", "school_admin", "teacher", "student", "parent"] },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const filteredNav = navItems.filter(item => {
    if (!userRole) return item.to === "/dashboard";
    return item.roles.includes(userRole);
  });

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <img src={logo} alt="Gem School Logo" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <h2 className="font-bold text-sm text-sidebar-foreground">Gem School</h2>
            <p className="text-xs text-sidebar-foreground/60">Management</p>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {filteredNav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-foreground">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            {userRole && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">
                {userRole.replace("_", " ")}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  GraduationCap, LayoutDashboard, Users, UserCog,
  School, Menu, X, LogOut, ChevronDown, Layers,
  Calendar, FileText, Megaphone, Home, DollarSign, FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/students", icon: Users, label: "Students" },
  { to: "/dashboard/teachers", icon: UserCog, label: "Teachers" },
  { to: "/dashboard/schools", icon: School, label: "Schools" },
  { to: "/dashboard/academics", icon: Layers, label: "Academics" },
  { to: "/dashboard/attendance", icon: Calendar, label: "Attendance" },
  { to: "/dashboard/grades", icon: FileText, label: "Grades" },
  { to: "/dashboard/fees", icon: DollarSign, label: "Fees" },
  { to: "/dashboard/announcements", icon: Megaphone, label: "Announcements" },
  { to: "/dashboard/parent", icon: Home, label: "Parent Portal" },
  { to: "/dashboard/import", icon: FileUp, label: "Import Data" },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  // Filter nav items based on role
  const filteredNav = navItems.filter(item => {
    if (userRole === "parent") {
      return ["/dashboard", "/dashboard/parent"].includes(item.to);
    }
    if (userRole === "student") {
      return ["/dashboard", "/dashboard/grades", "/dashboard/attendance"].includes(item.to);
    }
    if (userRole === "teacher") {
      return item.to !== "/dashboard/schools" && item.to !== "/dashboard/fees" && item.to !== "/dashboard/parent";
    }
    return true; // admin & super_admin see everything
  });

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-accent-foreground" />
          </div>
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

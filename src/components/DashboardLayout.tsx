import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, UserCog,
  School, Menu, X, LogOut, ChevronDown, Layers,
  Calendar, FileText, Megaphone, Home, DollarSign, FileUp, BookOpen, ClipboardList, GraduationCap,
  HelpCircle,Plus, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";
import { AddStaffModal } from "@/components/AddStaffModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



const navItems = [
  // 1. ሁሉም ሰው ዳሽቦርድ ማየት አለበት
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["super_admin", "school_admin", "teacher", "student", "parent", "director", "vice_academic", "vice_admin", "record_office", "human_resource", "casher"] },
  
  // 2. Record Office የሚያያቸው
  { to: "/dashboard/students", icon: Users, label: "Students", roles: ["super_admin", "school_admin", "record_office"] },
  
  // 3. Record Office እና Human Resource የሚያዩት
  { to: "/dashboard/teachers", icon: UserCog, label: "Teachers", roles: ["super_admin", "school_admin", "record_office", "human_resource"] },
  
  { to: "/dashboard/schools", icon: School, label: "Schools", roles: ["super_admin"] },

  // 4. አካዳሚክ እና Grades (Record office እና Vice Academic)
  { to: "/dashboard/academics", icon: Layers, label: "Academics", roles: ["super_admin", "school_admin", "director", "vice_academic", "record_office"] },
  { to: "/dashboard/question-bank", icon: BookOpen, label: "Question Bank", roles: ["super_admin", "school_admin", "teacher", "director", "vice_academic"] },
  { to: "/dashboard/exam-management", icon: ClipboardList, label: "Exam Management", roles: ["super_admin", "school_admin", "teacher", "director", "vice_academic", "record_office"] },

  // 5. Attendance (Vice Academic, Vice Admin እና HR ማየት አለባቸው)
  { to: "/dashboard/attendance", icon: Calendar, label: "Attendance", roles: ["super_admin", "school_admin", "teacher", "student", "director", "vice_admin", "vice_academic", "human_resource"] },

  // 6. ለ Casher እና Admin ብቻ
  { to: "/dashboard/fees", icon: DollarSign, label: "Finance & Casher", roles: ["super_admin", "director", "vice_admin", "casher"] },
  
  // 7. የሰው ሃይል (HR) ማኔጅመንት
  { to: "/dashboard/hr", icon: UserCheck, label: "HR Management", roles: ["super_admin", "director", "vice_admin", "human_resource"] },

  // የተማሪ ክፍሎች
  { to: "/dashboard/grades", icon: FileText, label: "My Grades", roles: ["student"] },
  { to: "/dashboard/exam-practice", icon: GraduationCap, label: "Exam Practice", roles: ["student"] },

  // የአስተዳደር ክፍሎች
  { to: "/dashboard/announcements", icon: Megaphone, label: "Announcements", roles: ["super_admin", "school_admin", "director", "record_office"] },
  { to: "/dashboard/import", icon: FileUp, label: "Import Data", roles: ["super_admin", "school_admin", "director", "record_office"] },
  { to: "/dashboard/support", icon: HelpCircle, label: "Support", roles: ["super_admin", "school_admin", "teacher", "student", "parent", "director", "record_office", "vice_academic", "vice_admin", "human_resource", "casher"] },
];



export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, userRole, signOut, schoolId } = useAuth(); 
  
  const isDirector = userRole === "director";      
  const isViceAdmin = userRole === "vice_admin";    

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
          <img src={logo} alt="GemSIS Logo" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <h2 className="font-bold text-sm text-sidebar-foreground">GemSIS</h2>
            <p className="text-xs text-sidebar-foreground/60">School Management</p>
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

        {/* 2. ዳይሬክተሩ ወይም ቪፒው ሰራተኛ ለመጨመር የሚጠቀሙበት በአረንጓዴ የተሞላ በተን */}
        {schoolId && (isDirector || isViceAdmin) && (
          <div className="p-3 mt-auto border-t border-sidebar-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full flex items-center justify-center gap-2.5 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 rounded-lg py-2.5 font-semibold text-sm shadow-md transition-all active:scale-[0.98]">
                  <Plus className="w-4 h-4" />
                  Add New Staff
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-2 bg-sidebar border-sidebar-border text-sidebar-foreground shadow-2xl rounded-xl animate-scale-in">
                
                {/* ለዳይሬክተር ብቻ */}
                {isDirector && (
                  <>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-sidebar-accent focus:text-sidebar-foreground cursor-pointer rounded-lg p-2.5">
                      <AddStaffModal role="record_office" schoolId={schoolId} label="Add Record Office" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-sidebar-accent focus:text-sidebar-foreground cursor-pointer rounded-lg p-2.5">
                      <AddStaffModal role="vice_admin" schoolId={schoolId} label="Add Vice Admin" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-sidebar-accent focus:text-sidebar-foreground cursor-pointer rounded-lg p-2.5">
                      <AddStaffModal role="vice_academic" schoolId={schoolId} label="Add Vice Academic" />
                    </DropdownMenuItem>
                  </>
                )}

                {/* ለቪፒ አድሚን ብቻ */}
                {isViceAdmin && (
                  <>
                    <DropdownMenuItem className="focus:bg-sidebar-accent focus:text-sidebar-foreground cursor-pointer rounded-lg p-2.5">
                      <AddStaffModal role="human_resource" schoolId={schoolId} label="Add HR Manager" />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-sidebar-accent focus:text-sidebar-foreground cursor-pointer rounded-lg p-2.5">
                      <AddStaffModal role="casher" schoolId={schoolId} label="Add Casher" />
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
        <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          © 2026 All Rights Reserved – GemSIS | Proprietary Code of Gem School Management System
        </footer>
      </div>
    </div>
  );
}

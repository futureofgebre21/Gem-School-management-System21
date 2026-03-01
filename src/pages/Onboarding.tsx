import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, School, UserCog, Users, Home, ArrowRight, Building2 } from "lucide-react";

type Step = "school-select" | "role-select";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("school-select");
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [schoolType, setSchoolType] = useState("private");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: "", city: "", country: "Nigeria", phone: "", email: "" });

  useEffect(() => {
    supabase.from("schools").select("id, name, type").order("name")
      .then(({ data }) => setSchools(data ?? []));
  }, []);

  const handleCreateSchool = async () => {
    if (!newSchool.name.trim()) { toast.error("School name is required"); return; }
    setLoading(true);
    const { data, error } = await supabase.from("schools")
      .insert({ ...newSchool, type: schoolType })
      .select("id")
      .single();
    if (error) { toast.error(error.message); setLoading(false); return; }
    setSelectedSchool(data.id);
    // Assign as school_admin automatically
    await assignRole(data.id, "school_admin");
  };

  const assignRole = async (schoolId: string, role: string) => {
    if (!user) return;
    setLoading(true);

    // Update profile with school_id
    await supabase.from("profiles").update({ school_id: schoolId }).eq("id", user.id);

    // Check if role already exists
    const { data: existing } = await supabase.from("user_roles")
      .select("id").eq("user_id", user.id).limit(1);

    if (existing && existing.length > 0) {
      await supabase.from("user_roles").update({ role: role as any, school_id: schoolId }).eq("user_id", user.id);
    } else {
      await supabase.from("user_roles").insert({ user_id: user.id, role: role as any, school_id: schoolId });
    }

    toast.success("Setup complete! Redirecting...");
    // Force page reload to refresh auth context
    window.location.href = "/dashboard";
  };

  const handleSelectSchool = () => {
    if (!selectedSchool) { toast.error("Please select a school"); return; }
    setStep("role-select");
  };

  const handleRoleSubmit = () => {
    if (!selectedRole) { toast.error("Please select your role"); return; }
    assignRole(selectedSchool, selectedRole);
  };

  const roles = [
    { value: "school_admin", label: "Admin", icon: UserCog, desc: "Full school management access" },
    { value: "teacher", label: "Teacher", icon: Users, desc: "Class & grade management" },
    { value: "student", label: "Student", icon: GraduationCap, desc: "View grades & attendance" },
    { value: "parent", label: "Parent", icon: Home, desc: "Monitor child's progress" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to Gem School</h1>
            <p className="text-sm text-muted-foreground">Let's set up your account</p>
          </div>
        </div>

        {step === "school-select" && (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Select Your School</CardTitle>
              <CardDescription>Choose an existing school or create a new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!createMode ? (
                <>
                  <div className="space-y-2">
                    <Label>School</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                      <SelectTrigger><SelectValue placeholder="Choose a school" /></SelectTrigger>
                      <SelectContent>
                        {schools.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} {s.type && <span className="text-muted-foreground">({s.type})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleSelectSchool} disabled={!selectedSchool}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setCreateMode(true)}>
                    <Building2 className="w-4 h-4 mr-2" /> Create New School
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label>School Name *</Label>
                      <Input required value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} placeholder="Enter school name" />
                    </div>
                    <div>
                      <Label>School Type</Label>
                      <Select value={schoolType} onValueChange={setSchoolType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">🏫 Private School</SelectItem>
                          <SelectItem value="government">🏛️ Government School</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>City</Label><Input value={newSchool.city} onChange={e => setNewSchool({ ...newSchool, city: e.target.value })} /></div>
                      <div><Label>Country</Label><Input value={newSchool.country} onChange={e => setNewSchool({ ...newSchool, country: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Phone</Label><Input value={newSchool.phone} onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })} /></div>
                      <div><Label>Email</Label><Input type="email" value={newSchool.email} onChange={e => setNewSchool({ ...newSchool, email: e.target.value })} /></div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateSchool} disabled={loading}>
                    {loading ? "Creating..." : "Create School & Continue as Admin"}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setCreateMode(false)}>
                    ← Back to school list
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "role-select" && (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">What's Your Role?</CardTitle>
              <CardDescription>Select how you'll use Gem School</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roles.map(r => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                    selectedRole === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedRole === r.value ? "gradient-primary" : "bg-muted"
                  }`}>
                    <r.icon className={`w-5 h-5 ${selectedRole === r.value ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </button>
              ))}
              <Button className="w-full mt-4" onClick={handleRoleSubmit} disabled={!selectedRole || loading}>
                {loading ? "Setting up..." : "Complete Setup"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("school-select")}>
                ← Back to school selection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

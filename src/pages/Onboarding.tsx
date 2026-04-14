import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, UserCog, Users, Home, ArrowRight, Building2, Hash, CheckCircle2, Copy } from "lucide-react";

// አሁን ካለው Step ላይ 'admin-sub-role' የሚል መጨመር
type Step = "role-select" | "admin-sub-role" | "school-code" | "school-create" | "school-created" | "teacher-verify";

const roles = [
  { value: "school_admin", label: "Admin", icon: UserCog, desc: "Create & manage your school" },
  { value: "teacher", label: "Teacher", icon: Users, desc: "Class & grade management" },
  { value: "student", label: "Student", icon: GraduationCap, desc: "View grades & attendance" },
  { value: "parent", label: "Parent", icon: Home, desc: "Monitor child's progress" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("role-select");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolType, setSchoolType] = useState("private");
  const [newSchool, setNewSchool] = useState({ name: "", city: "", country: "Nigeria", phone: "", email: "" });
  const [schoolCode, setSchoolCode] = useState("");
  const [foundSchool, setFoundSchool] = useState<{ id: string; name: string; school_code: string } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [createdSchoolCode, setCreatedSchoolCode] = useState("");
  const [teacherSchoolCode, setTeacherSchoolCode] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teacherVerifying, setTeacherVerifying] = useState(false);

  const lookupSchoolCode = async () => {
    if (!schoolCode.trim()) { toast.error("Please enter a school code"); return; }
    setLookingUp(true);
    setFoundSchool(null);
    const { data, error } = await supabase.rpc("get_school_by_code", { _code: schoolCode.trim() });
    setLookingUp(false);
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      toast.error("No school found with that code. Please check and try again.");
      return;
    }
    const school = Array.isArray(data) ? data[0] : data;
    setFoundSchool(school);
  };

  const assignRole = async (schoolId: string, role: string) => {
    if (!user) return;
    setLoading(true);
    // ከ user_roles ይልቅ user_assignments መጠቀም አለበት
const { error: roleError } = await supabase.from("user_assignments")
  .insert({ user_id: user.id, role_name: role, school_id: schoolId });

    if (roleError) { toast.error(getUserFriendlyError(roleError)); setLoading(false); return; }
    await supabase.from("profiles").update({ school_id: schoolId }).eq("id", user.id);
    toast.success("Setup complete! Redirecting...");
    window.location.href = "/dashboard";
  };

  const handleRoleContinue = () => {
  if (!selectedRole) { toast.error("Please select your role"); return; }
  
  if (selectedRole === "school_admin") {
    setStep("admin-sub-role"); 
  } else if (selectedRole === "teacher") {
    setStep("teacher-verify");
  } else {
    setStep("school-code");
  }
};


    const handleTeacherVerify = async () => {
    if (!teacherSchoolCode.trim() || !teacherId.trim()) {
      toast.error("Please enter both School Code and Teacher ID");
      return;
    }
    setTeacherVerifying(true);
    try {
      const { data: schoolData, error: schoolError } = await supabase.rpc("get_school_by_code", { _code: teacherSchoolCode.trim() });
      
      // 🕵️ መርማሪ መስመር 1: ትምህርት ቤቱን አግኝቶታል?
      console.log("School search result:", schoolData);

      if (schoolError || !schoolData || (Array.isArray(schoolData) && schoolData.length === 0)) {
        toast.error("Invalid school code.");
        setTeacherVerifying(false);
        return;
      }
// 3. መለያው ቀደም ብሎ በሌላ ሰው መያዙን ማረጋገጥ
if (teacher.user_id) {
  toast.error("ይህ መለያ ቀደም ብሎ ከሌላ አካውንት ጋር ተያይዟል!");
  setTeacherVerifying(false);
  return;
}

      const school = Array.isArray(schoolData) ? schoolData[0] : schoolData;

      // 🕵️ መርማሪ መስመር 2: ዳታቤዙ ውስጥ ለመፈለግ የያዘው መረጃ ምን ይመስላል?
      console.log("Searching Teacher with:", { school_id: school.id, teacher_id: teacherId.trim() });

      const { data: teacher, error: teacherError } = await supabase.from("teachers")
        .select("id, first_name, last_name,user_id")
        .eq("school_id", school.id)
        .ilike("teacher_id", teacherId.trim()) 
        .maybeSingle();

      // 🕵️ መርማሪ መስመር 3: ስህተቱ ምንድነው?
      if (teacherError) {
        console.error("Database Error Detail:", teacherError);
      }

      if (teacherError || !teacher) {
        toast.error("Teacher not found. Check the console (F12) for details.");
        setTeacherVerifying(false);
        return;
      }

     
        console.log("Updating teacher with User ID:", user?.id); 
const { error: updateError } = await supabase
  .from("teachers")
  .update({ user_id: user?.id }) 
  .eq("id", teacher.id)
  .select(); // የሰራ መሆኑን ለማረጋገጥ select() መጨመር

if (updateError) {
  console.error("Update failed:", updateError.message);
  toast.error("Do not connect data፦ " + updateError.message);
  return;
}

      if (updateError) throw updateError;
      await assignRole(school.id, "teacher");

    } catch (error: any) {
      console.error("Catch Block Error:", error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setTeacherVerifying(false);
    }
  };


  const handleJoinSchool = () => {
    if (!foundSchool) { toast.error("Please look up a valid school code first"); return; }
    assignRole(foundSchool.id, selectedRole);
  };

  const handleCreateSchool = async () => {
    if (!newSchool.name.trim()) { toast.error("School name is required"); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("create_school_with_admin", {
      _name: newSchool.name,
      _type: schoolType,
      _city: newSchool.city || null,
      _country: newSchool.country || null,
      _phone: newSchool.phone || null,
      _email: newSchool.email || null,
    });
    if (error) { toast.error(getUserFriendlyError(error)); setLoading(false); return; }
    if (data) {
      const { data: school } = await supabase.from("schools").select("school_code").eq("id", data).single();
      if (school?.school_code) {
        setCreatedSchoolCode(school.school_code);
        setStep("school-created");
        setLoading(false);
        return;
      }
    }
    toast.success("School created!");
    window.location.href = "/dashboard";
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdSchoolCode);
    toast.success("School code copied!");
  };

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
              <Button className="w-full mt-4" onClick={handleRoleContinue} disabled={!selectedRole}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}


{step === "admin-sub-role" && (
  <Card className="shadow-card">
    <CardHeader className="text-center">
      <CardTitle className="text-xl">Admin Position</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {["Record Office", "Director", "Vice Academic", "Vice Admin", "Human Resource"].map((label) => {
        // 1. መጀመሪያ ስሙን ለዳታቤዝ በሚሆን መልኩ ማስተካከል (ለምሳሌ፡ record_office)
        const roleValue = label.toLowerCase().replace(/\s+/g, "_");

        return (
          <Button 
            key={roleValue} 
            variant="outline" 
            className="w-full justify-start text-left" 
            onClick={() => {
              setSelectedRole(roleValue); 
              setStep("school-code"); 
            }}
          >
            {label}
          </Button>
        );
      })}

      <Button variant="ghost" className="w-full mt-2" onClick={() => setStep("role-select")}>
        ← Back to role selection 
      </Button>
    </CardContent>
  </Card>
)}



        {step === "school-code" && (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Hash className="w-5 h-5" /> Enter School Code
              </CardTitle>
              <CardDescription>
                Ask your school administrator for the unique school code to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={schoolCode}
                    onChange={e => { setSchoolCode(e.target.value.toUpperCase()); setFoundSchool(null); }}
                    placeholder="e.g. GEM-X1"
                    className="font-mono text-lg tracking-widest text-center uppercase"
                    maxLength={10}
                  />
                  <Button variant="outline" onClick={lookupSchoolCode} disabled={lookingUp || !schoolCode.trim()}>
                    {lookingUp ? "..." : "Look Up"}
                  </Button>
                </div>
              </div>

              {foundSchool && (
                <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{foundSchool.name}</p>
                    <p className="text-xs text-muted-foreground">Code: {foundSchool.school_code}</p>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={handleJoinSchool} disabled={!foundSchool || loading}>
                {loading ? "Joining..." : `Join as ${roles.find(r => r.value === selectedRole)?.label}`}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setStep("role-select"); setSchoolCode(""); setFoundSchool(null); }}>
                ← Back to role selection
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "teacher-verify" && (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Users className="w-5 h-5" /> Teacher Verification
              </CardTitle>
              <CardDescription>
                Enter your School Code and Teacher ID to verify your registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Code</Label>
                <Input
                  value={teacherSchoolCode}
                  onChange={e => setTeacherSchoolCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GEM-X1"
                  className="font-mono text-lg tracking-widest text-center uppercase"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Teacher ID</Label>
                <Input
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                  placeholder="Enter your Teacher ID "
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Your Teacher ID is provided by your school administrator.</p>
              </div>
              <Button className="w-full" onClick={handleTeacherVerify} disabled={teacherVerifying || !teacherSchoolCode.trim() || !teacherId.trim()}>
                {teacherVerifying ? "Verifying..." : "Verify & Join"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setStep("role-select"); setTeacherSchoolCode(""); setTeacherId(""); }}>
                ← Back to role selection
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "school-create" && (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5" /> Register Your School
              </CardTitle>
              <CardDescription>A unique School Code will be generated automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <div><Label>Phone</Label><Input value={newSchool.phone} onChange={e => setNewSchool({ ...newSchool, phone: e.target.value.replace(/[^0-9+\-() ]/g, '') })} placeholder="Numbers only" inputMode="tel" /></div>
                  <div><Label>Email</Label><Input type="email" value={newSchool.email} onChange={e => setNewSchool({ ...newSchool, email: e.target.value })} /></div>
                </div>
              </div>
              <Button className="w-full" onClick={handleCreateSchool} disabled={loading}>
                {loading ? "Creating..." : "Create School"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("role-select")}>
                ← Back to role selection
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "school-created" && (
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">School Registered!</CardTitle>
              <CardDescription>Share this code with teachers, students, and parents so they can join your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-primary bg-primary/5">
                <span className="text-3xl font-mono font-bold tracking-widest text-primary">{createdSchoolCode}</span>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  <Copy className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                This is your unique School Code. Anyone with this code can request to join your school.
              </p>
              <Button className="w-full" onClick={() => { window.location.href = "/dashboard"; }}>
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

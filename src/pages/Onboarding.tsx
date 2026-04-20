import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, UserCog, Users, Home, ArrowRight, Building2, Hash, CheckCircle2, Copy } from "lucide-react";

// አሁን ካለው Step ላይ 'admin-sub-role' የሚል መጨመር
type Step = "role-select" | "admin-sub-role" | "school-code" | "school-create" | "school-created" | "teacher-verify" | "staff-verify";


const roles = [
  { value: "school_admin", label: "School Admin", icon: UserCog, desc: "Create & manage your school" },
  { value: "vice_admin", label: "Vice Admin", icon: UserCog, desc: "Administrative support" },
  { value: "vice_academic", label: "Vice Academic", icon: Users, desc: "Academic coordination" },
  { value: "teacher", label: "Teacher", icon: Users, desc: "Class & grade management" },
  { value: "human_resource", label: "Human Resource", icon: Users, desc: "Staff management" },
  { value: "cashier", label: "Cashier", icon: Home, desc: "Fee management" },
  { value: "director", label: "Director", icon: Building2, desc: "School leadership" },
  { value: "record_office", label: "Record Office", icon: Hash, desc: "Records management" },
  { value: "student", label: "Student", icon: GraduationCap, desc: "View grades & attendance" },
  { value: "parent", label: "Parent", icon: Home, desc: "Monitor child's progress" },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth(); 
  const navigate = useNavigate();

  // 3. ተጠቃሚው መኖሩን የሚያረጋግጠው logic (በፈንክሽኑ ውስጥ)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth"); 
    }
  }, [user, authLoading, navigate]);

  // 4. Loading check (በፈንክሽኑ ውስጥ)
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
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
const [staffInviteCode, setStaffInviteCode] = useState("");


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

  const assignRole = async (schoolId: string, roleOrPosition: string) => {
    if (!user) return;
    setLoading(true);
    
    // Admin positions that map to school_admin role
    const adminPositions = ["director", "vice_academic", "vice_admin", "record_office", "human_resource", "cashier"];
    
    // Determine role_name and position
    let roleToInsert: string;
    let positionToInsert: string | null = null;

    if (adminPositions.includes(roleOrPosition)) {
      roleToInsert = "school_admin";
      positionToInsert = roleOrPosition;
    } else {
      roleToInsert = roleOrPosition;
      positionToInsert = null;
    }

    const { error: roleError } = await supabase.from("user_assignments")
      .insert({ 
        user_id: user.id, 
        role_name: roleToInsert,
        position: positionToInsert,
        school_id: schoolId 
      });

    if (roleError) { 
      toast.error(getUserFriendlyError(roleError)); 
      setLoading(false); 
      return; 
    }
    
    // Update profile
    const profileUpdate: any = { school_id: schoolId };
    if (positionToInsert) {
      profileUpdate.position = positionToInsert;
    }
    
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
    
    toast.success("Setup complete! Redirecting...");
    window.location.href = "/dashboard";
  };

  const handleRoleContinue = () => {
  if (!selectedRole) { toast.error("Please select your role"); return; }
  
  const staffRoles = ["vice_admin", "vice_academic", "human_resource", "cashier", "director", "record_office"];
  
  if (selectedRole === "school_admin") {
    setStep("admin-sub-role"); 
  } else if (selectedRole === "teacher") {
    setStep("teacher-verify");
  } else if (staffRoles.includes(selectedRole)) {
    setStep("staff-verify");
  } else {
    setStep("school-code");
  }
};

   const handleTeacherVerify = async () => {
  if (!teacherSchoolCode.trim() || !teacherId.trim()) {
    toast.error("እባክዎ School Code እና Teacher ID ያስገቡ");
    return;
  }

  setTeacherVerifying(true);

  try {
    // አሁን ስራው በሙሉ በዳታቤዝ ውስጥ ስለሚሰራ፣ እዚህ ጋር የምንጠራው RPC ብቻ ነው
    const { data, error } = await supabase.rpc('verify_teacher_and_link', {
      input_school_code: teacherSchoolCode.trim(),
      input_teacher_id: teacherId.trim()
    });

    if (error) {
      console.error("Supabase Error:", error);
      toast.error("ስህተት ተፈጥሯል: " + error.message);
    } else if (data.success) {
      toast.success(data.message);
      // ወደ ዳሽቦርድ ማዛወር ካለብህ እዚህ ጋር ጻፍ
    } else {
      toast.error(data.message);
    }
  } catch (err) {
    console.error("Error:", err);
    toast.error("የሲስተም ችግር ተፈጥሯል");
  } finally {
    setTeacherVerifying(false);
  }
};


const handleStaffVerify = async () => {
  if (!schoolCode.trim() || !staffInviteCode.trim()) {
    toast.error("Please enter both School Code and Invite Code");
    return;
  }
  setLoading(true);
  try {
    // 1. Look up the school by code
    const { data: schoolData, error: schoolError } = await supabase.rpc("get_school_by_code", { _code: schoolCode.trim() });
    const school = Array.isArray(schoolData) ? schoolData[0] : schoolData;

    if (schoolError || !school) {
      toast.error("Invalid school code.");
      setLoading(false);
      return;
    }

    // 2. Verify the invite code for the selected position
    const { data: invite, error: inviteError } = await supabase
      .from("staff_invites")
      .select("*")
      .eq("school_id", school.id)
      .eq("invite_code", staffInviteCode.trim().toUpperCase())
      .eq("position", selectedRole)
      .is("used_at", null)
      .maybeSingle();

    if (inviteError || !invite) {
      toast.error("Invalid Invite Code or Position mismatch.");
      console.error("Invite error:", inviteError);
      setLoading(false);
      return;
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      toast.error("Invite Code has expired.");
      setLoading(false);
      return;
    }

    // 3. Update profile with staff_id and position
    await supabase.from("profiles").update({ 
      school_id: school.id,
      staff_id: invite.staff_id,
      position: selectedRole
    }).eq("id", user?.id);
    
    // Mark invite as used
    await supabase.from("staff_invites").update({ 
      used_at: new Date().toISOString(), 
      used_by: user?.id 
    }).eq("id", invite.id);

    // 4. Assign role: role_name='school_admin', position=selectedRole
    if (user) {
      const { error: roleError } = await supabase.from("user_assignments")
        .insert({ 
          user_id: user.id, 
          role_name: "school_admin",
          position: selectedRole,
          school_id: school.id 
        });

      if (roleError) {
        toast.error(getUserFriendlyError(roleError));
        setLoading(false);
        return;
      }
    }

    toast.success("Setup complete! Redirecting...");
    window.location.href = "/dashboard";

  } catch (error: any) {
    console.error("Verification error:", error);
    toast.error("Verification failed: " + error.message);
  } finally {
    setLoading(false);
  }
};

  
const handleJoinSchool = () => {
  if (!foundSchool) { toast.error("Please look up a valid school code first"); return; }

  // 🛡️ የሰራተኞች ዝርዝር (እነዚህ ሰዎች ያለ Invite Code መግባት የለባቸውም)
  const restrictedRoles = ["record_office", "vice_academic", "vice_admin", "human_resource", "cashier", "director"];

  if (restrictedRoles.includes(selectedRole)) {
    toast.error("Staff members must use an Invite Code to join.");
    setStep("staff-verify"); // ወደ ትክክለኛው የverification ገጽ መልሳቸው
    return;
  }

  // ተማሪ ወይም ወላጅ ከሆኑ ብቻ ነው በቀጥታ እንዲያልፉ የሚፈቀደው
  assignRole(foundSchool.id, selectedRole);
};

    const handleCreateSchool = async () => {
    if (!newSchool.name.trim()) { toast.error("School name is required"); return; }
    setLoading(true);

    const { data, error } = await supabase.rpc("create_school_with_admin", {
      school_name: newSchool.name,
      school_type: schoolType,
      city: newSchool.city || null,
      country: newSchool.country || null,
      phone: newSchool.phone || null,
      email: newSchool.email || null,
      p_role_name: "director", 
      p_user_id: user.id
    });

    if (error) { 
      toast.error(getUserFriendlyError(error)); 
      setLoading(false); 
      return; 
    }

    if (data) {
      // ትምህርት ቤቱን በአይዲ ፈልገን ኮዱን ማምጣት
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("school_code")
        .eq("id", data)
        .single();

      if (school && school.school_code) {
        setCreatedSchoolCode(school.school_code);
        setStep("school-created");
      } else {
        // ካልተሳካ ወደ ዳሽቦርድ ይላክ
        window.location.href = "/dashboard";
      }
    }
    
    setLoading(false); // በሁለቱም ሁኔታ Loading ን ማቆም
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
      <CardTitle className="text-xl">Select Your Admin Position</CardTitle>
      <CardDescription>Choose your specific role within school administration</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {[
        { label: "Director", value: "director", desc: "School leadership and management" },
        { label: "Vice Academic", value: "vice_academic", desc: "Academic coordination" },
        { label: "Vice Admin", value: "vice_admin", desc: "Administrative support" },
        { label: "Record Office", value: "record_office", desc: "Records and student management" },
        { label: "Human Resource", value: "human_resource", desc: "Staff management" },
        { label: "Cashier", value: "cashier", desc: "Fee and payment management" }
      ].map((position) => (
        <button
          key={position.value}
          onClick={() => {
            setSelectedRole(position.value);
            if (position.value === "director") {
              setStep("school-create");
            } else {
              setStep("staff-verify");
            }
          }}
          className="w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left hover:border-primary/40 border-border"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
            <UserCog className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{position.label}</p>
            <p className="text-xs text-muted-foreground">{position.desc}</p>
          </div>
        </button>
      ))}

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

{step === "staff-verify" && (
  <Card className="shadow-card">
    <CardHeader className="text-center">
      <CardTitle className="text-xl flex items-center justify-center gap-2">
        <UserCog className="w-5 h-5" /> Staff Verification
      </CardTitle>
      <CardDescription>
        Enter School Code and your Invite Code to join as {selectedRole?.replace('_', ' ')}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label>School Code</Label>
        <Input
          value={schoolCode}
          onChange={e => setSchoolCode(e.target.value.toUpperCase())}
          placeholder="e.g. GEM-X1"
          className="font-mono text-lg tracking-widest text-center uppercase"
        />
      </div>
      <div className="space-y-2">
        <Label>Invite Code</Label>
        <Input
          value={staffInviteCode}
          onChange={e => setStaffInviteCode(e.target.value.toUpperCase())}
          placeholder="Enter your Invite Code"
          className="font-mono text-center"
        />
        <p className="text-xs text-muted-foreground text-center">This code was generated by your school director.</p>
      </div>
      <Button className="w-full" onClick={handleStaffVerify} disabled={loading || !schoolCode || !staffInviteCode}>
        {loading ? "Verifying..." : "Verify & Join"}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => setStep("admin-sub-role")}>
        ← Back
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

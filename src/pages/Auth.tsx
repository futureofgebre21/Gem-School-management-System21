import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Student login state
  const [studentId, setStudentId] = useState("");
  const [studentSchoolCode, setStudentSchoolCode] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from("user_assignments")
            .select("role_name, school_id")
            .eq("user_id", user.id)
            .limit(1);

          if (roles && roles.length > 0 && roles[0].school_id) {
            navigate("/dashboard");
          } else {
            navigate("/onboarding");
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      }
    } catch (error: unknown) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !studentSchoolCode.trim()) {
      toast.error("Please enter both your Student ID and School Code");
      return;
    }
    setStudentLoading(true);

    try {
      // Look up school by code
      const { data: schoolData, error: schoolError } = await supabase.rpc("get_school_by_code", { _code: studentSchoolCode.trim() });
      if (schoolError || !schoolData || (Array.isArray(schoolData) && schoolData.length === 0)) {
        toast.error("Invalid school code. Please check and try again.");
        setStudentLoading(false);
        return;
      }
      const school = Array.isArray(schoolData) ? schoolData[0] : schoolData;

      // Find student by ID number in that school
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, first_name, last_name, parent_email")
        .eq("school_id", school.id)
        .eq("student_id_number", studentId.trim().toUpperCase())
        .eq("status", "active")
        .single();

      if (studentError || !student) {
        toast.error("Student not found. Please check your Student ID and School Code.");
        setStudentLoading(false);
        return;
      }

      // Use a deterministic email for the student account
      const studentEmail = `student_${student.id}@gemschool.internal`;
      const studentPassword = `GemStudent!${student.id.slice(0, 8)}`;

      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: studentPassword,
      });

      if (signInError) {
        // Create account if doesn't exist
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: studentEmail,
          password: studentPassword,
          options: {
            data: {
              full_name: `${student.first_name} ${student.last_name}`,
              is_student: true,
              student_id: student.id,
            },
          },
        });

        if (signUpError) {
          toast.error("Unable to create student account. Please contact your school administrator.");
          setStudentLoading(false);
          return;
        }

        // Assign student role
        if (signUpData.user) {
          await supabase.from("user_assignments").insert({
            user_id: signUpData.user.id,
            role_name: "student",
            school_id: school.id,
          });

          await supabase.from("profiles").update({ school_id: school.id }).eq("id", signUpData.user.id);
        }

        // Sign in after signup
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: studentEmail,
          password: studentPassword,
        });

        if (retryError) {
          toast.error("Account created but login failed. Please try again.");
          setStudentLoading(false);
          return;
        }
      }

      toast.success(`Welcome, ${student.first_name}!`);
      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setStudentLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gem School</h1>
            <p className="text-sm text-muted-foreground">Management System</p>
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <Tabs defaultValue="staff" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="staff">Staff / Admin</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
              </TabsList>

              <TabsContent value="staff">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">{isLogin ? "Welcome Back" : "Create Account"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {isLogin ? "Sign in to manage your school" : "Get started with Gem School"}
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required={!isLogin} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.edu" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strong password required: must include uppercase letters, lowercase letters, numbers, and special characters (symbols).
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="student">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">Student Login</h2>
                  <p className="text-sm text-muted-foreground">Sign in using your Student ID</p>
                </div>
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentSchoolCode">School Code</Label>
                    <Input
                      id="studentSchoolCode"
                      value={studentSchoolCode}
                      onChange={(e) => setStudentSchoolCode(e.target.value.toUpperCase())}
                      placeholder="e.g. GEM-X1"
                      className="font-mono tracking-widest uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                      placeholder="e.g. GEM-00001"
                      className="font-mono tracking-widest uppercase"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={studentLoading}>
                    {studentLoading ? "Signing in..." : "Sign In as Student"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

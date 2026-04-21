import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ADMIN_POSITIONS = [
  { value: "director", label: "Director" },
  { value: "vice_academic", label: "Vice Academic" },
  { value: "vice_admin", label: "Vice Admin" },
  { value: "record_office", label: "Record Office" },
  { value: "human_resource", label: "Human Resource" },
  { value: "cashier", label: "Cashier" },
] as const;

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup-only
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [adminPosition, setAdminPosition] = useState("");

  // School info (only required when creating a school_admin)
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("private");
  const [schoolCity, setSchoolCity] = useState("");
  const [schoolCountry, setSchoolCountry] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        return;
      }

      // SIGN UP
      if (!role) throw new Error("Please select a role.");
      if (role === "school_admin" && !adminPosition)
        throw new Error("Please select your admin position.");

      // Flat-role model: store the position itself as role_name for school admins
      const finalRoleName = role === "school_admin" ? adminPosition : role;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup failed.");

      // For school_admin: create school + assignment via RPC (handles school_id NOT NULL)
      if (role === "school_admin") {
        if (!schoolName) throw new Error("School name is required.");
        const { error: rpcError } = await supabase.rpc("create_school_with_admin", {
          school_name: schoolName,
          school_type: schoolType,
          city: schoolCity,
          country: schoolCountry,
          phone: schoolPhone,
          email,
          p_role_name: finalRoleName,
          p_user_id: data.user.id,
        });
        if (rpcError) throw rpcError;
      }
      // Note: teachers/students must join an existing school via invite/code flow,
      // so we don't create a user_assignments row here for them.

      toast.success("Account created! Check your email to confirm.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">{isLogin ? "Sign in" : "Create account"}</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Welcome back to your school portal." : "Set up your school portal account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setAdminPosition("");
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select your role</option>
                  <option value="school_admin">School Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {role === "school_admin" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adminPosition">Admin position</Label>
                    <select
                      id="adminPosition"
                      value={adminPosition}
                      onChange={(e) => setAdminPosition(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select position</option>
                      {ADMIN_POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolName">School name</Label>
                    <Input
                      id="schoolName"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="schoolType">Type</Label>
                      <select
                        id="schoolType"
                        value={schoolType}
                        onChange={(e) => setSchoolType(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolPhone">Phone</Label>
                      <Input
                        id="schoolPhone"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="schoolCity">City</Label>
                      <Input
                        id="schoolCity"
                        value={schoolCity}
                        onChange={(e) => setSchoolCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolCountry">Country</Label>
                      <Input
                        id="schoolCountry"
                        value={schoolCountry}
                        onChange={(e) => setSchoolCountry(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {(role === "teacher" || role === "student") && (
                <p className="text-xs text-muted-foreground">
                  After confirming your email, you'll be linked to your school via an
                  invite code from your administrator.
                </p>
              )}
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary underline-offset-4 hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
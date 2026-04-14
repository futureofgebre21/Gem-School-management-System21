import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  schoolId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  schoolId: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

    const fetchUserMeta = async (userId: string) => {
    try {
      // 1. መረጃውን የምንወስደው ከ user_assignments ቴብል ነው
      const { data: assignment, error } = await supabase
        .from("user_assignments")
        .select("role_name, school_id") 
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user meta:", error.message);
        return;
      }

      if (assignment) {
        setUserRole(assignment.role_name);
        setSchoolId(assignment.school_id);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserMeta(session.user.id), 0);
        } else {
          setUserRole(null);
          setSchoolId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserMeta(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setSchoolId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, schoolId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

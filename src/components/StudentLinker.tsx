import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, CheckCircle, AlertTriangle, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface StudentResult {
  id: string;
  first_name: string;
  last_name: string;
  student_id_number: string;
  class: string | null;
  section: string | null;
  school_id: string;
  parent_phone: string | null;
  schools?: { name: string } | null;
}

export default function StudentLinker({ onLinked }: { onLinked: () => void }) {
  const { user, userRole } = useAuth();
  const isParent = userRole === "parent";
  const isStudent = userRole === "student";

  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (isParent && user) {
      supabase.from("profiles").select("parent_search_count, parent_name_locked, parent_phone_locked")
        .eq("id", user.id).single().then(({ data }) => {
          if (data) {
            setSearchCount(data.parent_search_count ?? 0);
            if (data.parent_name_locked) { setFullName(data.parent_name_locked); }
            if (data.parent_phone_locked) { setParentPhone(data.parent_phone_locked); setLocked(true); }
          }
        });
    }
  }, [isParent, user]);

  const handleSearch = async () => {
    if (!fullName.trim() || !studentId.trim() || !grade.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (isParent && !parentPhone.trim()) {
      setError("Parent phone number is required.");
      return;
    }
    if (isParent && searchCount >= 3) {
      setError("You have reached the maximum of 3 search attempts.");
      return;
    }

    setSearching(true);
    setError("");
    setResult(null);

    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

      let query = supabase.from("students")
        .select("id, first_name, last_name, student_id_number, class, section, school_id, parent_phone, schools(name)")
        .eq("student_id_number", studentId.trim())
        .eq("status", "active");

      // Use exact match on first_name (case-insensitive via ilike)
      query = query.ilike("first_name", firstName);
      if (lastName) {
        query = query.ilike("last_name", lastName);
      }

      // Grade filter - try exact match first
      query = query.ilike("class", grade.trim());

      if (isStudent && section.trim()) {
        query = query.ilike("section", section.trim());
      }

      if (isParent && parentPhone.trim()) {
        const phone = parentPhone.trim().replace(/\D/g, "");
        query = query.ilike("parent_phone", `%${phone}%`);
      }

      const { data, error: dbError } = await query.limit(5);

      const match = data && data.length > 0 ? data[0] : null;

      if (dbError || !data) {
        setError("No student found. Please check your details and try again.");
      } else {
        // Additional validation for parent phone
        if (isParent) {
          const dbPhone = (data.parent_phone ?? "").replace(/\D/g, "");
          const inputPhone = parentPhone.trim().replace(/\D/g, "");
          if (!dbPhone.includes(inputPhone) && !inputPhone.includes(dbPhone)) {
            setError("Details do not match. Parent phone number does not match our records.");
            setSearching(false);
            return;
          }
        }
        setResult(data as unknown as StudentResult);

        // Lock parent info on first search
        if (isParent && !locked && user) {
          await supabase.from("profiles").update({
            parent_search_count: searchCount + 1,
            parent_name_locked: fullName.trim(),
            parent_phone_locked: parentPhone.trim(),
          }).eq("id", user.id);
          setSearchCount(prev => prev + 1);
          setLocked(true);
        } else if (isParent && user) {
          await supabase.from("profiles").update({
            parent_search_count: searchCount + 1,
          }).eq("id", user.id);
          setSearchCount(prev => prev + 1);
        }
      }
    } catch {
      setError("An error occurred during the search.");
    }
    setSearching(false);
  };

  const handleConfirm = async () => {
    if (!result || !user) return;
    setConfirming(true);
    try {
      const { error: updateErr } = await supabase.from("profiles")
        .update({ linked_student_id: result.id })
        .eq("id", user.id);

      if (updateErr) throw updateErr;
      toast.success("Account linked successfully!");
      onLinked();
    } catch (err: any) {
      toast.error(err.message || "Failed to link account");
    }
    setConfirming(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {isParent ? "Find Your Child" : "Find Your Profile"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isParent
            ? "Enter your child's details to link your account."
            : "Enter your student details to link your account."}
        </p>
        {isParent && (
          <p className="text-xs text-muted-foreground mt-2">
            Search attempts: {searchCount}/3
          </p>
        )}
      </div>

      {!result ? (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg">Search Student</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{isParent ? "Student Full Name" : "Your Full Name"} *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="e.g. John Doe" disabled={isParent && locked && !!fullName} />
            </div>
            <div>
              <Label>Student ID *</Label>
              <Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. GEM-00001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Grade *</Label>
                <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Grade 9" />
              </div>
              {isStudent && (
                <div>
                  <Label>Section *</Label>
                  <Input value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. Room 2" />
                </div>
              )}
            </div>
            {isParent && (
              <div>
                <Label>Parent Phone Number *</Label>
                <Input value={parentPhone}
                  onChange={e => setParentPhone(e.target.value.replace(/[^0-9+\-() ]/g, ""))}
                  placeholder="e.g. 0953071795" disabled={locked && !!parentPhone} />
              </div>
            )}
            {isStudent && (
              <div>
                <Label>Parent Phone</Label>
                <Input value={parentPhone}
                  onChange={e => setParentPhone(e.target.value.replace(/[^0-9+\-() ]/g, ""))}
                  placeholder="e.g. 0953071795" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button className="w-full" onClick={handleSearch} disabled={searching || (isParent && searchCount >= 3)}>
              <Search className="w-4 h-4 mr-2" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Student Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{result.first_name} {result.last_name}</p></div>
              <div><span className="text-muted-foreground">Student ID:</span><p className="font-medium font-mono">{result.student_id_number}</p></div>
              <div><span className="text-muted-foreground">Grade:</span><p className="font-medium">{result.class || "—"}</p></div>
              <div><span className="text-muted-foreground">Section:</span><p className="font-medium">{result.section || "—"}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground">School:</span><p className="font-medium">{(result as any).schools?.name || "—"}</p></div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <p className="text-sm font-medium">
                {isParent ? "Is this your child?" : "Is this your profile?"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setError(""); }}>
                No, Search Again
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={confirming}>
                {confirming ? "Linking..." : "Yes, Confirm"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

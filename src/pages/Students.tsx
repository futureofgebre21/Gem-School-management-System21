import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Download } from "lucide-react";

interface Student {
  id: string;
  student_id_number: string;
  first_name: string;
  last_name: string;
  class: string | null;
  section: string | null;
  gender: string | null;
  status: string;
  parent_name: string | null;
  parent_phone: string | null;
  date_of_birth: string | null;
  parent_email: string | null;
  address: string | null;
  school_id: string;
}

const emptyForm = {
  first_name: "", last_name: "", gender: "",
  parent_name: "", parent_phone: "", parent_email: "", address: "", date_of_birth: "",
  class_id: "", section_id: "", academic_year_id: "",
};

export default function Students() {
  const { schoolId, userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [classesList, setClassesList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [yearsList, setYearsList] = useState<any[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<Record<string, { class_name: string; section_name: string }>>({});

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).order("name"),
      supabase.from("academic_years").select("id, name, is_current").eq("school_id", schoolId).order("start_date", { ascending: false }),
    ]).then(([c, s, y]) => {
      setClassesList(c.data ?? []);
      setSectionsList(s.data ?? []);
      setYearsList(y.data ?? []);
      const current = (y.data ?? []).find((yr: any) => yr.is_current);
      if (current) setForm(f => ({ ...f, academic_year_id: current.id }));
    });
  }, [schoolId]);

  const fetchStudents = async () => {
    if (!schoolId) return;
    setLoading(true);

    let filteredStudentIds: string[] | null = null;
    if (filterClass) {
      const { data: assignments } = await supabase.from("entrollments")
        .select("student_id").eq("class_id", filterClass).eq("school_id", schoolId);
      filteredStudentIds = (assignments ?? []).map(a => a.student_id);
    }

    let query = supabase.from("students").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id_number.ilike.%${search}%`);
    if (filteredStudentIds !== null) {
      if (filteredStudentIds.length === 0) { setStudents([]); setLoading(false); return; }
      query = query.in("id", filteredStudentIds);
    }
    if (filterGender) query = query.eq("gender", filterGender);
    const { data, error } = await query;
    if (error) toast.error(getUserFriendlyError(error));
    else setStudents(data ?? []);

    const studentIds = (data ?? []).map(s => s.id);
    if (studentIds.length > 0) {
      const { data: assigns } = await supabase.from("entrollments")
        .select("student_id, classes(name), sections(name)")
        .eq("school_id", schoolId)
        .in("student_id", studentIds);
      const map: Record<string, { class_name: string; section_name: string }> = {};
      (assigns ?? []).forEach((a: any) => {
        map[a.student_id] = { class_name: a.classes?.name ?? "", section_name: a.sections?.name ?? "" };
      });
      setStudentAssignments(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [schoolId, search, filterClass, filterGender]);

  const filteredSections = sectionsList.filter(s => s.class_id === form.class_id);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // በጥልቀት የመመርመሪያ መስመር
  if (!form.class_id || form.class_id === "" || !form.academic_year_id) 
  
 { toast.error("Please select a class and academic year"); return;
 }

        const selectedYear = yearsList.find(y => y.id === form.academic_year_id);
    const selectedClass = classesList.find(c => c.id === form.class_id);
    const selectedSection = sectionsList.find(s => s.id === form.section_id);

    const studentPayload = {
      first_name: form.first_name, 
      last_name: form.last_name,
      gender: form.gender || null, 
      date_of_birth: form.date_of_birth || null,
      parent_name: form.parent_name || null, 
      parent_phone: form.parent_phone || null,
      parent_email: form.parent_email || null, 
      address: form.address || null,
      school_id: schoolId,
      class: selectedClass?.name || null,
      section: selectedSection?.name || null,
    };

    const entrollmentData = {
      school_id: schoolId,
      class_id: form.class_id,
      section_id: form.section_id || null,
      academic_year_id: form.academic_year_id,
      grade_level: selectedClass?.name || null,
      section: selectedSection?.name || null,
      school_year: selectedYear?.name || null,
      status: 'active'
    };

    if (editId) {
      const { error: studentErr } = await supabase.from("students").update(studentPayload).eq("id", editId);
      if (studentErr) { toast.error(getUserFriendlyError(studentErr)); return; }
      
      await supabase.from("entrollments").delete().eq("student_id", editId).eq("school_id", schoolId);
      const { error: enrollErr } = await supabase.from("entrollments").insert({
        student_id: editId,
        ...enrollmentData
      });
      
      if (enrollErr) { toast.error("Update Error: " + enrollErr.message); return; }
      toast.success("Student updated successfully");
    } else {
      const { data: newStudent, error: studentErr } = await supabase.from("students")
        .insert({ ...studentPayload, student_id_number: "" }).select("id").single();
      
      if (studentErr) { toast.error(getUserFriendlyError(studentErr)); return; }

      if (newStudent) {
        const { error: enrollErr } = await supabase.from("entrollments").insert({
          student_id: newStudent.id,
          ...entrollmentData
        });
        
        if (enrollErr) {
          toast.error("Entrollment Failed: " + enrollErr.message);
          return;
        }
      }
      toast.success("Student registered and entrolled successfully");
    }

    setDialogOpen(false); setForm(emptyForm); setEditId(null); fetchStudents();
  };

  const handleEdit = async (s: Student) => {
    setEditId(s.id);
    const { data: assign } = await supabase.from("entrollments")
      .select("class_id, section_id, academic_year_id")
      .eq("student_id", s.id).eq("school_id", schoolId).limit(1).single();
    const currentYear = yearsList.find((y: any) => y.is_current);
    setForm({
      first_name: s.first_name, last_name: s.last_name, gender: s.gender ?? "",
      parent_name: s.parent_name ?? "", parent_phone: s.parent_phone ?? "",
      parent_email: s.parent_email ?? "", address: s.address ?? "", date_of_birth: s.date_of_birth ?? "",
      class_id: assign?.class_id ?? "", section_id: assign?.section_id ?? "",
      academic_year_id: assign?.academic_year_id ?? currentYear?.id ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(getUserFriendlyError(error));
    else { toast.success("Student deleted"); fetchStudents(); }
  };

  const exportCSV = () => {
    const headers = ["ID", "First Name", "Last Name", "Class", "Section", "Gender", "Status", "Parent", "Phone"];
    const rows = students.map(s => {
      const a = studentAssignments[s.id];
      return [s.student_id_number, s.first_name, s.last_name, a?.class_name ?? s.class, a?.section_name ?? s.section, s.gender, s.status, s.parent_name, s.parent_phone];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "students.csv"; a.click();
  };

  const maleCount = students.filter(s => s.gender === "male").length;
  const femaleCount = students.filter(s => s.gender === "female").length;

  const renderTable = (data: Student[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead>
          <TableHead>Section</TableHead><TableHead>Gender</TableHead><TableHead>Status</TableHead>
          <TableHead>Parent</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
        ) : data.length === 0 ? (
          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
        ) : (
          data.map(s => {
            const a = studentAssignments[s.id];
            return (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.student_id_number}</TableCell>
                <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                <TableCell>{a?.class_name ?? s.class ?? "-"}</TableCell>
                <TableCell>{a?.section_name ?? s.section ?? "-"}</TableCell>
                <TableCell className="capitalize">{s.gender ?? "-"}</TableCell>
                <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge></TableCell>
                <TableCell className="text-sm">{s.parent_name ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Edit className="w-4 h-4" /></Button>
                  {userRole !== 'director' && userRole !== 'record_office' && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} total • <span className="text-info">♂ {maleCount} Male</span> • <span className="text-secondary">♀ {femaleCount} Female</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Student</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? "Edit Student" : "Register Student"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name *</Label><Input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
                  <div><Label>Last Name *</Label><Input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
                </div>
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm font-semibold mb-2">Class Assignment *</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
  <Label>Class *</Label>
  <Select 
    value={form.class_id} 
    onValueChange={v => setForm({ ...form, class_id: v, section_id: "" })}
  >
    <SelectTrigger className={!form.class_id ? "border-red-500" : ""}>
      <SelectValue placeholder="Select Class" />
    </SelectTrigger>
    <SelectContent>
      {classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
                    <div>
                      <Label>Section</Label>
                      <Select value={form.section_id} onValueChange={v => setForm({ ...form, section_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {filteredSections.length === 0
                            ? <SelectItem value="none" disabled>No sections</SelectItem>
                            : filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
  <Label>Year *</Label>
  <Select 
    value={form.academic_year_id} 
    onValueChange={v => setForm({ ...form, academic_year_id: v })}
  >
    <SelectTrigger className={!form.academic_year_id ? "border-red-500" : ""}>
      <SelectValue placeholder="Select Year" />
    </SelectTrigger>
    <SelectContent>
      {yearsList.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Parent / Guardian</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name</Label><Input value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} /></div>
                    <div><Label>Phone</Label><Input value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} /></div>
                  </div>
                  <div className="mt-2"><Label>Email</Label><Input type="email" value={form.parent_email} onChange={e => setForm({ ...form, parent_email: e.target.value })} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <Button type="submit" className="w-full">{editId ? "Update" : "Register"} Student</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterClass} onValueChange={v => setFilterClass(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterGender} onValueChange={v => setFilterGender(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="All Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gender</SelectItem>
                <SelectItem value="male">♂ Male</SelectItem>
                <SelectItem value="female">♀ Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-4">
              <TabsList className="grid grid-cols-3 w-full max-w-xs">
                <TabsTrigger value="all">All ({students.length})</TabsTrigger>
                <TabsTrigger value="male">♂ ({maleCount})</TabsTrigger>
                <TabsTrigger value="female">♀ ({femaleCount})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all" className="overflow-x-auto">{renderTable(students)}</TabsContent>
            <TabsContent value="male" className="overflow-x-auto">{renderTable(students.filter(s => s.gender === "male"))}</TabsContent>
            <TabsContent value="female" className="overflow-x-auto">{renderTable(students.filter(s => s.gender === "female"))}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

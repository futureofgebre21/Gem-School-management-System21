import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Download, Upload } from "lucide-react";

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
  first_name: "", last_name: "", class: "", section: "", gender: "",
  parent_name: "", parent_phone: "", parent_email: "", address: "", date_of_birth: "",
};

export default function Students() {
  const { schoolId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchStudents = async () => {
    if (!schoolId) return;
    setLoading(true);
    let query = supabase.from("students").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id_number.ilike.%${search}%`);
    if (filterClass) query = query.eq("class", filterClass);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setStudents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [schoolId, search, filterClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) { toast.error("No school assigned"); return; }

    const payload = {
      ...form,
      school_id: schoolId,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
    };

    if (editId) {
      const { error } = await supabase.from("students").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Student updated");
    } else {
      const { error } = await supabase.from("students").insert({ ...payload, student_id_number: "" });
      if (error) { toast.error(error.message); return; }
      toast.success("Student registered");
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchStudents();
  };

  const handleEdit = (s: Student) => {
    setEditId(s.id);
    setForm({
      first_name: s.first_name, last_name: s.last_name,
      class: s.class ?? "", section: s.section ?? "",
      gender: s.gender ?? "", parent_name: s.parent_name ?? "",
      parent_phone: s.parent_phone ?? "", parent_email: s.parent_email ?? "",
      address: s.address ?? "", date_of_birth: s.date_of_birth ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Student deleted"); fetchStudents(); }
  };

  const exportCSV = () => {
    const headers = ["ID", "First Name", "Last Name", "Class", "Section", "Gender", "Status", "Parent", "Phone"];
    const rows = students.map(s => [s.student_id_number, s.first_name, s.last_name, s.class, s.section, s.gender, s.status, s.parent_name, s.parent_phone]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
  };

  const classes = [...new Set(students.map(s => s.class).filter(Boolean))];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} registered students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Student" : "Register Student"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name *</Label><Input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                  <div><Label>Last Name *</Label><Input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Class</Label><Input value={form.class} onChange={e => setForm({...form, class: e.target.value})} placeholder="e.g. JSS1" /></div>
                  <div><Label>Section</Label><Input value={form.section} onChange={e => setForm({...form, section: e.target.value})} placeholder="e.g. A" /></div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} /></div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Parent / Guardian</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name</Label><Input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} /></div>
                    <div><Label>Phone</Label><Input value={form.parent_phone} onChange={e => setForm({...form, parent_phone: e.target.value})} /></div>
                  </div>
                  <div className="mt-2"><Label>Email</Label><Input type="email" value={form.parent_email} onChange={e => setForm({...form, parent_email: e.target.value})} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
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
              <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : students.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
                ) : (
                  students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.student_id_number}</TableCell>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell>{s.class} {s.section && `(${s.section})`}</TableCell>
                      <TableCell className="capitalize">{s.gender ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{s.parent_name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

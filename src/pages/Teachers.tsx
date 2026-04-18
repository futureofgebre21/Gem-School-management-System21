import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  subjects: string[];
  classes: string[];
grade: string;
  status: string;
  school_id: string;
teacher_id?: string;
}

const emptyForm = {
  first_name: "", last_name: "", email: "", phone: "", subjects: "", classes: "",grade:"",
};

export default function Teachers() {
  const { schoolId } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTeachers = async () => {
    if (!schoolId) return;
    setLoading(true);
    let query = supabase.from("teachers").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) toast.error(getUserFriendlyError(error));
    else setTeachers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTeachers(); }, [schoolId, search]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!schoolId) { toast.error("No school assigned"); return; }

  let finalTeacherId = "";

  if (!editId) {
    // 1. መምህራንን መቁጠር (ለ ID ቁጥር)
    const { count } = await supabase
      .from("teachers")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId);

    // 2. ID Generation (ቀለል ባለና አስተማማኝ መንገድ)
    // የትምህርት ቤቱን ስም ከመፈለግ ይልቅ "TCH" መጠቀም ወይም 
    // ከ schoolId የመጀመሪያዎቹን 3 ፊደላት መውሰድ ይሻላል
    const prefix = "TCH"; 
    finalTeacherId = `${prefix}-${String((count || 0) + 1).padStart(4, '0')}`;
  }

  const payload = {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email || null,
    phone: form.phone || null,
    subjects: form.subjects.split(",").map(s => s.trim()).filter(Boolean),
    classes: form.classes.split(",").map(s => s.trim()).filter(Boolean),
    grade: form.grade || "", // null እንዳይሆን "" ጨምረናል
    school_id: schoolId,
    status: "active", // 👈 ይህ የግድ መጨመር አለበት (Error 23502 የሚመጣው በዚህ ነው)
    user_id: null,
    ...(finalTeacherId && { teacher_id: finalTeacherId }),
  };

  if (editId) {
    // Update ሲደረግ status እንዳይቀየር payload ን ለብቻ መለየት ትችላለህ
    const { error } = await supabase.from("teachers").update(payload).eq("id", editId);
    if (error) { toast.error(getUserFriendlyError(error)); return; }
    toast.success("Teacher updated");
  } else {
    const { error } = await supabase.from("teachers").insert([payload]); // 👈 Array ውስጥ አድርገህ ላከው
    if (error) { 
      console.error("Insert Error:", error); // ለበለጠ ምርመራ
      toast.error(getUserFriendlyError(error)); 
      return; 
    }
    toast.success(`Teacher registered! ID: ${finalTeacherId}`);
  }

  setDialogOpen(false);
  setForm(emptyForm);
  setEditId(null);
  fetchTeachers();
};


  const handleEdit = (t: Teacher) => {
    setEditId(t.id);
    setForm({
      first_name: t.first_name, last_name: t.last_name,
      email: t.email ?? "", phone: t.phone ?? "",
      subjects: t.subjects.join(", "), classes: t.classes.join(", "),
grade: t.grade ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this teacher?")) return;
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) toast.error(getUserFriendlyError(error));
    else { toast.success("Teacher deleted"); fetchTeachers(); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-sm text-muted-foreground">{teachers.length} registered teachers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Teacher</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Teacher" : "Register Teacher"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name *</Label><Input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                <div><Label>Last Name *</Label><Input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
              <div><Label>Subjects (comma-separated)</Label><Input value={form.subjects} onChange={e => setForm({...form, subjects: e.target.value})} placeholder="Math, English, Science" /></div>
              <div><Label>Classes (comma-separated)</Label><Input value={form.classes} onChange={e => setForm({...form, classes: e.target.value})} placeholder="JSS1, JSS2, SS1" /></div>

<div>
  <Label>Grade (e.g. 11)</Label>
  <Input 
    value={form.grade} 
    onChange={e => setForm({...form, grade: e.target.value})} 
    placeholder="Enter grade" 
  />
</div>

              <Button type="submit" className="w-full">{editId ? "Update" : "Register"} Teacher</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search teachers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
             
 
<TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Teacher ID</TableHead>
    <TableHead>Email</TableHead>
    <TableHead>Phone</TableHead>
    <TableHead>Subjects</TableHead>
    <TableHead>Classes</TableHead>
    <TableHead>Grade</TableHead>
    <TableHead>Status</TableHead>
    <TableHead className="text-right">Actions</TableHead>
  </TableRow>
</TableHeader>

              <TableBody>
  {loading ? (
    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
  ) : teachers.length === 0 ? (
    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No teachers found</TableCell></TableRow>
  ) : (
    teachers.map(t => (
      <TableRow key={t.id}>
        {/* 1. Name */}
        <TableCell className="font-medium text-nowrap">{t.first_name} {t.last_name}</TableCell>
        
        {/* 2. Teacher ID - ልክ እንደጠየቅከው ከስም ቀጥሎ ገብቷል */}
        <TableCell className="text-sm font-mono text-blue-600">
          {t.teacher_id || "No ID"}
        </TableCell>

        {/* 3. Email */}
        <TableCell className="text-sm">{t.email ?? "-"}</TableCell>
        
        {/* 4. Phone */}
        <TableCell className="text-sm">{t.phone ?? "-"}</TableCell>
        
        {/* 5. Subjects */}
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {t.subjects.map(s => <Badge key={s} variant="outline" className="text-[11px]">{s}</Badge>)}
          </div>
        </TableCell>
        
        {/* 6. Classes */}
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {t.classes.map(c => <Badge key={c} variant="secondary" className="text-[11px]">{c}</Badge>)}
          </div>
        </TableCell>

        {/* 7. Grade */}
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {t.grade ? (
              t.grade.split(",").map((g, index) => (
                <Badge key={index} variant="outline" className="text-[11px] bg-green-50 text-green-700">
                  {g.trim()}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs">-</span>
            )}
          </div>
        </TableCell>

        {/* 8. Status */}
        <TableCell>
          <Badge variant={t.status === "active" ? "default" : "secondary"} className="capitalize">{t.status}</Badge>
        </TableCell>
        
        {/* 9. Actions */}
        <TableCell className="text-right">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

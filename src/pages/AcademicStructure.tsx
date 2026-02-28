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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Calendar, BookOpen, Layers, Grid3X3 } from "lucide-react";

// ===== Academic Years =====
function AcademicYearsTab({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", is_current: false });

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("academic_years").select("*").eq("school_id", schoolId).order("start_date", { ascending: false });
    if (error) toast.error(error.message);
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, school_id: schoolId };
    if (editId) {
      const { error } = await supabase.from("academic_years").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("academic_years").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); setEditId(null); setForm({ name: "", start_date: "", end_date: "", is_current: false }); fetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this academic year?")) return;
    const { error } = await supabase.from("academic_years").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} academic years</p>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ name: "", start_date: "", end_date: "", is_current: false }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Year</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Academic Year</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2025/2026" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date *</Label><Input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date *</Label><Input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} id="is_current" />
                <Label htmlFor="is_current">Current Academic Year</Label>
              </div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow> :
            items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No academic years</TableCell></TableRow> :
              items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.start_date}</TableCell>
                  <TableCell>{i.end_date}</TableCell>
                  <TableCell>{i.is_current ? <Badge>Current</Badge> : <Badge variant="secondary">Past</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditId(i.id); setForm({ name: i.name, start_date: i.start_date, end_date: i.end_date, is_current: i.is_current }); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===== Classes =====
function ClassesTab({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("classes").select("*").eq("school_id", schoolId).order("name");
    if (error) toast.error(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, school_id: schoolId, description: form.description || null };
    if (editId) {
      const { error } = await supabase.from("classes").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("classes").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); setEditId(null); setForm({ name: "", description: "" }); fetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} classes</p>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ name: "", description: "" }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Class</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Class</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. JSS1, SS2" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow> :
            items.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No classes</TableCell></TableRow> :
              items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-muted-foreground">{i.description ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditId(i.id); setForm({ name: i.name, description: i.description ?? "" }); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===== Sections =====
function SectionsTab({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", class_id: "" });

  const fetch = async () => {
    setLoading(true);
    const [sectionsRes, classesRes] = await Promise.all([
      supabase.from("sections").select("*, classes(name)").eq("school_id", schoolId).order("name"),
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    ]);
    if (sectionsRes.error) toast.error(sectionsRes.error.message);
    else setItems(sectionsRes.data ?? []);
    setClasses(classesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, class_id: form.class_id, school_id: schoolId };
    if (editId) {
      const { error } = await supabase.from("sections").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("sections").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); setEditId(null); setForm({ name: "", class_id: "" }); fetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} sections</p>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ name: "", class_id: "" }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Section</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Section</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Class *</Label>
                <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Section Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. A, B, Science" /></div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Section</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow> :
            items.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No sections</TableCell></TableRow> :
              items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{(i as any).classes?.name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditId(i.id); setForm({ name: i.name, class_id: i.class_id }); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===== Subjects =====
function SubjectsTab({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("subjects").select("*").eq("school_id", schoolId).order("name");
    if (error) toast.error(error.message); else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, code: form.code || null, description: form.description || null, school_id: schoolId };
    if (editId) {
      const { error } = await supabase.from("subjects").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("subjects").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); setEditId(null); setForm({ name: "", code: "", description: "" }); fetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} subjects</p>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ name: "", code: "", description: "" }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Subject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Subject</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow> :
            items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No subjects</TableCell></TableRow> :
              items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell><Badge variant="secondary">{i.code ?? "-"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{i.description ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditId(i.id); setForm({ name: i.name, code: i.code ?? "", description: i.description ?? "" }); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ===== Main Page =====
export default function AcademicStructure() {
  const { schoolId } = useAuth();

  if (!schoolId) return <div className="text-center py-12 text-muted-foreground">No school assigned to your account.</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Academic Structure</h1>
        <p className="text-sm text-muted-foreground">Manage classes, sections, subjects & academic years</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Tabs defaultValue="classes">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="classes"><Layers className="w-4 h-4 mr-1 hidden sm:inline" />Classes</TabsTrigger>
              <TabsTrigger value="sections"><Grid3X3 className="w-4 h-4 mr-1 hidden sm:inline" />Sections</TabsTrigger>
              <TabsTrigger value="subjects"><BookOpen className="w-4 h-4 mr-1 hidden sm:inline" />Subjects</TabsTrigger>
              <TabsTrigger value="years"><Calendar className="w-4 h-4 mr-1 hidden sm:inline" />Years</TabsTrigger>
            </TabsList>
            <TabsContent value="classes"><ClassesTab schoolId={schoolId} /></TabsContent>
            <TabsContent value="sections"><SectionsTab schoolId={schoolId} /></TabsContent>
            <TabsContent value="subjects"><SubjectsTab schoolId={schoolId} /></TabsContent>
            <TabsContent value="years"><AcademicYearsTab schoolId={schoolId} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

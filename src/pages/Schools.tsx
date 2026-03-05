import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, School, MapPin, Phone, Mail, Edit, Trash2 } from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  type: string;
}

const emptyForm = { name: "", address: "", city: "", country: "Nigeria", phone: "", email: "", type: "private" };

export default function Schools() {
  const { userRole, schoolId } = useAuth();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchSchools = async () => {
    setLoading(true);
    let query = supabase.from("schools").select("*").order("name");
    // School admins only see their own school
    if (userRole === "school_admin" && schoolId) {
      query = query.eq("id", schoolId);
    }
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setSchools((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, [userRole, schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase.from("schools").update(form).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("School updated");
    } else {
      const { error } = await supabase.from("schools").insert(form);
      if (error) { toast.error(error.message); return; }
      toast.success("School created");
    }
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    fetchSchools();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this school?")) return;
    const { error } = await supabase.from("schools").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchSchools(); }
  };

  const canManage = userRole === "super_admin" || userRole === "school_admin";
  const canCreate = userRole === "super_admin"; // Only super admin can create new schools
  const canDelete = userRole === "super_admin"; // Only super admin can delete schools

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{userRole === "school_admin" ? "My School" : "Schools"}</h1>
          {userRole === "super_admin" && (
            <p className="text-sm text-muted-foreground">{schools.length} registered schools</p>
          )}
        </div>
        {(canCreate || editId) && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            {canCreate && (
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add School</Button>
              </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} School</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div><Label>School Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>School Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">🏫 Private School</SelectItem>
                      <SelectItem value="government">🏛️ Government School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full">{editId ? "Update" : "Create"} School</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading schools...</p>
      ) : schools.length === 0 ? (
        <Card className="shadow-card"><CardContent className="py-12 text-center text-muted-foreground">No schools registered yet</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map(s => (
            <Card key={s.id} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                      <School className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <Badge variant={s.type === "government" ? "secondary" : "default"} className="capitalize text-xs mt-1">
                        {s.type === "government" ? "🏛️" : "🏫"} {s.type}
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditId(s.id);
                        setForm({ name: s.name, address: s.address ?? "", city: s.city ?? "", country: s.country ?? "Nigeria", phone: s.phone ?? "", email: s.email ?? "", type: s.type ?? "private" });
                        setDialogOpen(true);
                      }}><Edit className="w-4 h-4" /></Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {(s.city || s.country) && (
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{[s.city, s.country].filter(Boolean).join(", ")}</div>
                )}
                {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{s.phone}</div>}
                {s.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{s.email}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

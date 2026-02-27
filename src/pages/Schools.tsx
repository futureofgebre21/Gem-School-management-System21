import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, School, MapPin, Phone, Mail } from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

export default function Schools() {
  const { userRole } = useAuth();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "Nigeria", phone: "", email: "" });

  const fetchSchools = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("schools").select("*").order("name");
    if (error) toast.error(error.message);
    else setSchools(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("schools").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("School created");
    setDialogOpen(false);
    setForm({ name: "", address: "", city: "", country: "Nigeria", phone: "", email: "" });
    fetchSchools();
  };

  const isSuperAdmin = userRole === "super_admin";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schools</h1>
          <p className="text-sm text-muted-foreground">{schools.length} registered schools</p>
        </div>
        {isSuperAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add School</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create School</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div><Label>School Name *</Label><Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                  <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>
                <Button type="submit" className="w-full">Create School</Button>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                    <School className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
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

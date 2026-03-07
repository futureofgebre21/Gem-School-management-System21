import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Megaphone, Mail } from "lucide-react";

export default function Announcements() {
  const { schoolId, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", target_audience: "all" });

  const fetchItems = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data, error } = await supabase.from("announcements")
      .select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
    if (error) toast.error(getUserFriendlyError(error));
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [schoolId]);

  const sendEmailNotification = async (title: string, content: string, audience: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-announcement-email", {
        body: { school_id: schoolId, title, content, target_audience: audience },
      });
      if (error) console.error("Email notification failed:", error);
      else toast.success("Email notifications sent");
    } catch (err) {
      console.error("Email notification error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    const payload = { ...form, school_id: schoolId, created_by: user?.id };
    if (editId) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", editId);
      if (error) { toast.error(getUserFriendlyError(error)); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("announcements").insert(payload);
      if (error) { toast.error(getUserFriendlyError(error)); return; }
      toast.success("Published");
      sendEmailNotification(form.title, form.content, form.target_audience);
    }
    setDialogOpen(false); setEditId(null); setForm({ title: "", content: "", target_audience: "all" }); fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(getUserFriendlyError(error)); else { toast.success("Deleted"); fetchItems(); }
  };

  if (!schoolId) return <div className="text-center py-12 text-muted-foreground">No school assigned.</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Publish announcements — notifications are sent automatically</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ title: "", content: "", target_audience: "all" }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Announcement</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Title *</Label><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Content *</Label><Textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} /></div>
              <div>
                <Label>Audience</Label>
                <Select value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                {editId ? "Editing won't resend notifications" : "In-app notifications will be sent to all school users"}
              </div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Publish"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> :
        items.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(a => (
              <Card key={a.id} className="shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize text-xs">{a.target_audience}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditId(a.id); setForm({ title: a.title, content: a.content, target_audience: a.target_audience }); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{a.content}</p></CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

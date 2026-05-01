import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, DollarSign, Receipt, BarChart3, Download, Edit, Trash2 } from "lucide-react";

function FeeStructureTab({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: "", 
    amount: "", 
    grade: "", 
    academic_year: "", 
    frequency: "annually",
    description: "",
    is_active: true
  });

  const fetchData = async () => {
    setLoading(true);
    const [fees, cls, yrs] = await Promise.all([
      supabase.from("fee_structures").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    ]);
    setItems(fees.data ?? []);
    setClasses(cls.data ?? []);
    setYears(yrs.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      amount: parseFloat(form.amount),
      grade: form.grade || null,
      academic_year: form.academic_year,
      frequency: form.frequency,
      description: form.description || null,
      is_active: form.is_active,
      school_id: schoolId,
      created_by: (await supabase.auth.getUser()).data.user?.id
    };

    if (editId) {
      const { error } = await supabase.from("fee_structures").update(payload).eq("id", editId);
      if (error) { toast.error(getUserFriendlyError(error)); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("fee_structures").insert(payload);
      if (error) { toast.error(getUserFriendlyError(error)); return; }
      toast.success("Created");
    }
    setDialogOpen(false); setEditId(null); 
    setForm({ name: "", amount: "", grade: "", academic_year: "", frequency: "annually", description: "", is_active: true }); 
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee structure?")) return;
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) toast.error(getUserFriendlyError(error));
    else { toast.success("Deleted"); fetchData(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} fee structures</p>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm({ name: "", amount: "", grade: "", academic_year: "", frequency: "annually", description: "", is_active: true }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Fee</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Fee Structure</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Fee Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tuition Fee" /></div>
              <div><Label>Amount *</Label><Input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Grade (optional)</Label>
                  <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Grade 1" />
                </div>
                <div>
                  <Label>Academic Year *</Label>
                  <Select value={form.academic_year} onValueChange={v => setForm({ ...form, academic_year: v })}>
                    <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y.id} value={y.name}>{y.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fee Name</TableHead><TableHead>Amount</TableHead><TableHead>Grade</TableHead>
            <TableHead>Frequency</TableHead><TableHead>Year</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow> :
            items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No fee structures</TableCell></TableRow> :
              items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="font-bold">₦{Number(i.amount).toLocaleString()}</TableCell>
                  <TableCell>{i.grade || "All"}</TableCell>
                  <TableCell><Badge variant="outline">{i.frequency}</Badge></TableCell>
                  <TableCell>{i.academic_year}</TableCell>
                  <TableCell><Badge variant={i.is_active ? "default" : "secondary"}>{i.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditId(i.id);
                      setForm({ 
                        name: i.name, 
                        amount: String(i.amount), 
                        grade: i.grade || "", 
                        academic_year: i.academic_year, 
                        frequency: i.frequency, 
                        description: i.description || "",
                        is_active: i.is_active
                      });
                      setDialogOpen(true);
                    }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentsTab({ schoolId }: { schoolId: string }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ 
    student_id: "", 
    fee_structure_id: "", 
    amount: "", 
    payment_method: "cash", 
    payment_date: new Date().toISOString().split("T")[0], 
    transaction_id: "",
    remarks: "" 
  });

  const fetchData = async () => {
    setLoading(true);
    const [pay, stu, fee] = await Promise.all([
      supabase.from("fee_payments").select("*, students(first_name, last_name, student_id_number), fee_structures(name, amount)").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(100),
      supabase.from("students").select("id, first_name, last_name, student_id_number").eq("school_id", schoolId).eq("status", "active").order("first_name"),
      supabase.from("fee_structures").select("id, name, amount").eq("school_id", schoolId).order("name"),
    ]);
    setPayments(pay.data ?? []);
    setStudents(stu.data ?? []);
    setFees(fee.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("fee_payments").insert({
      student_id: form.student_id,
      fee_structure_id: form.fee_structure_id,
      amount_paid: parseFloat(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      receipt_number: form.transaction_id || null,
      remarks: form.remarks || null,
      school_id: schoolId,
      recorded_by: user?.id,
    });
    if (error) { toast.error(getUserFriendlyError(error)); return; }
    toast.success("Payment recorded");
    setDialogOpen(false);
    setForm({ 
      student_id: "", 
      fee_structure_id: "", 
      amount: "", 
      payment_method: "cash", 
      payment_date: new Date().toISOString().split("T")[0], 
      transaction_id: "",
      remarks: "" 
    });
    fetchData();
  };

  const exportCSV = () => {
    const headers = ["Student", "Fee", "Amount", "Method", "Date", "Collected By"];
    const rows = payments.map(p => [
      `${(p as any).students?.first_name} ${(p as any).students?.last_name}`,
      (p as any).fee_structures?.name, p.amount, p.payment_method, p.payment_date, p.collected_by,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fee-payments.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{payments.length} payment records</p>
        <div className="flex gap-2">
          {payments.length > 0 && <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export</Button>}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Record Payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Fee Payment</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label>Student *</Label>
                  <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee *</Label>
                  <Select value={form.fee_structure_id} onValueChange={v => {
                    const fee = fees.find(f => f.id === v);
                    setForm({ ...form, fee_structure_id: v, amount: fee ? String(fee.amount) : form.amount });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select fee" /></SelectTrigger>
                    <SelectContent>{fees.map(f => <SelectItem key={f.id} value={f.id}>{f.name} (₦{Number(f.amount).toLocaleString()})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount *</Label><Input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Transaction ID</Label><Input value={form.transaction_id} onChange={e => setForm({ ...form, transaction_id: e.target.value })} placeholder="Optional" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} /></div>
                </div>
                <div><Label>Remarks</Label><Input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
                <Button type="submit" className="w-full">Record Payment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead><TableHead>Fee</TableHead>
            <TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead><TableHead>Collected By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow> :
            payments.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No payments recorded</TableCell></TableRow> :
              payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{(p as any).students?.first_name} {(p as any).students?.last_name}</TableCell>
                  <TableCell>{(p as any).fee_structures?.name}</TableCell>
                  <TableCell className="font-bold">₦{Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell className="capitalize text-sm">{p.payment_method?.replace("_", " ")}</TableCell>
                  <TableCell className="text-sm">{p.payment_date}</TableCell>
                  <TableCell className="text-sm">{p.collected_by}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FeeSummaryTab({ schoolId }: { schoolId: string }) {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const { data: fees } = await supabase.from("fee_structures").select("id, name, amount").eq("school_id", schoolId);
      const { data: payments } = await supabase.from("fee_payments").select("fee_structure_id, amount_paid, status").eq("school_id", schoolId);

      const feeMap: Record<string, { name: string; expected: number; collected: number; paid: number; unpaid: number; partial: number }> = {};
      (fees ?? []).forEach(f => {
        feeMap[f.id] = { name: f.name, expected: Number(f.amount), collected: 0, paid: 0, unpaid: 0, partial: 0 };
      });

      let collected = 0;
      (payments ?? []).forEach(p => {
        if (feeMap[p.fee_structure_id]) {
          feeMap[p.fee_structure_id].collected += Number(p.amount_paid);
          feeMap[p.fee_structure_id][p.status as "paid" | "unpaid" | "partial"]++;
          collected += Number(p.amount_paid);
        }
      });

      setTotalCollected(collected);
      setSummary(Object.values(feeMap));
      setLoading(false);
    };
    fetchSummary();
  }, [schoolId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold text-primary">₦{totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Fee Types</p>
            <p className="text-2xl font-bold text-foreground">{summary.length}</p>
          </CardContent>
        </Card>
      </div>
      {loading ? <p className="text-center py-6 text-muted-foreground">Loading...</p> :
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee</TableHead><TableHead>Expected</TableHead><TableHead>Collected</TableHead>
              <TableHead>Paid</TableHead><TableHead>Partial</TableHead><TableHead>Unpaid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>₦{s.expected.toLocaleString()}</TableCell>
                <TableCell className="font-bold text-primary">₦{s.collected.toLocaleString()}</TableCell>
                <TableCell><Badge>{s.paid}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{s.partial}</Badge></TableCell>
                <TableCell><Badge variant="destructive">{s.unpaid}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    </div>
  );
}

export default function Fees() {
  const { schoolId } = useAuth();
  if (!schoolId) return <div className="text-center py-12 text-muted-foreground">No school assigned.</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Fees & Finance</h1>
        <p className="text-sm text-muted-foreground">Manage fee structures, track payments, and generate receipts</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Tabs defaultValue="structures">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="structures"><DollarSign className="w-4 h-4 mr-1 hidden sm:inline" />Fee Setup</TabsTrigger>
              <TabsTrigger value="payments"><Receipt className="w-4 h-4 mr-1 hidden sm:inline" />Payments</TabsTrigger>
              <TabsTrigger value="summary"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="structures"><FeeStructureTab schoolId={schoolId} /></TabsContent>
            <TabsContent value="payments"><PaymentsTab schoolId={schoolId} /></TabsContent>
            <TabsContent value="summary"><FeeSummaryTab schoolId={schoolId} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// ፎርሙ በቋሚነት እንዲታይ label አክል
export function AddStaffModal({ role, schoolId, label }: { role: string, schoolId: string, label: string }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    year: new Date().getFullYear().toString(),
    phone: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [open, setOpen] = useState(false);

  const handleAddStaff = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("generate_staff_invite_with_data", {
        p_email: formData.email.trim(),
        p_first_name: formData.firstName.trim(),
        p_last_name: formData.lastName.trim(),
        p_phone: formData.phone.trim(),
        p_role: role,
        p_school_id: schoolId,
        p_year: formData.year,
      });

      if (error) {
        console.error("RPC Error:", error);
        toast.error(error.message || "Failed to generate invite");
      } else if (data) {
        setGeneratedCode(data);
        toast.success(`${label} invite generated successfully!`);
        // Clear form
        setFormData({
          firstName: "",
          lastName: "",
          year: new Date().getFullYear().toString(),
          phone: "",
          email: ""
        });
      } else {
        toast.error("Failed to generate invite");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to generate invite");
    }
    setLoading(false);
  };

  return (
    // ፎርሙን በDialog ምትክ በካርድ ቅርጽ ለማሳየት label ሳይሆን ፎርሙን ብቻ ተጠቀም
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-3 text-left font-medium">
          <Plus className="w-4 h-4 text-sidebar-foreground/80" />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-sidebar border-sidebar-border text-sidebar-foreground rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold text-xl text-sidebar-foreground">Add {label}</DialogTitle>
          <DialogDescription className="text-sm text-sidebar-foreground/70">Fill in the details to generate an invite code.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Input 
              placeholder="First Name" 
              className="bg-sidebar-accent border-sidebar-border" 
              value={formData.firstName}
              onChange={e => setFormData({...formData, firstName: e.target.value})} 
            />
            <Input 
              placeholder="Last Name" 
              className="bg-sidebar-accent border-sidebar-border" 
              value={formData.lastName}
              onChange={e => setFormData({...formData, lastName: e.target.value})} 
            />
          </div>
          <Input 
            placeholder="Email (optional)" 
            type="email"
            className="bg-sidebar-accent border-sidebar-border" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})} 
          />
          <Input 
            placeholder="Phone (optional)" 
            className="bg-sidebar-accent border-sidebar-border" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})} 
          />
          
          {!generatedCode ? (
            <Button onClick={handleAddStaff} disabled={loading} className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
              {loading ? "Generating..." : `Generate Invite for ${label}`}
            </Button>
          ) : (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center shadow-inner">
              <p className="text-sm font-medium text-primary mb-2">Invite Code Generated:</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-primary">{generatedCode}</p>
              <p className="text-xs text-muted-foreground mt-2">Share this code with the staff member to join</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

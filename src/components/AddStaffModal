import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function AddStaffModal({ role, schoolId }: { role: string, schoolId: string }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    year: new Date().getFullYear().toString(),
    phone: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const handleAddStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("generate_staff_invite_with_data", {
      p_school_id: schoolId,
      p_role: role,
      p_first_name: formData.firstName,
      p_last_name: formData.lastName,
      p_phone: formData.phone,
      p_email: formData.email,
      p_year: formData.year
    });

    if (error) {
      toast.error(error.message);
    } else {
      setGeneratedCode(data);
      toast.success(`${role} code generated successfully!`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="font-bold">Add {role.replace('_', ' ')}</h3>
      <Input placeholder="First Name" onChange={e => setFormData({...formData, firstName: e.target.value})} />
      <Input placeholder="Last Name" onChange={e => setFormData({...formData, lastName: e.target.value})} />
      <Input placeholder="Phone" onChange={e => setFormData({...formData, phone: e.target.value})} />
      <Input placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} />

      {!generatedCode ? (
        <Button onClick={handleAddStaff} disabled={loading}>
          {loading ? "Generating..." : `Add ${role}`}
        </Button>
      ) : (
        <div className="p-3 bg-green-100 border border-green-500 rounded text-center">
          <p className="text-sm font-medium">Share this code:</p>
          <p className="text-2xl font-mono font-bold">{generatedCode}</p>
        </div>
      )}
    </div>
  );
}
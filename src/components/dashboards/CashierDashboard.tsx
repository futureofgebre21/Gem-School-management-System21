import { Link } from "react-router-dom";
import { DollarSign } from "lucide-react";

export default function CashierDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cashier Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage fee structures, payments, and statuses.</p>
      </div>
      <Link to="/dashboard/fees" className="block p-4 rounded-lg bg-primary/5 hover:bg-primary/10 text-center">
        <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
        <p className="text-sm font-medium">Fee Management</p>
      </Link>
    </div>
  );
}

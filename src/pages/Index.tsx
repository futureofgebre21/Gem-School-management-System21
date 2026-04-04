import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Users, School, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container max-w-5xl py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Gem School Management Logo" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-bold text-lg">Gem School</span>
          </div>
          <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>

        <div className="container max-w-5xl py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Modern School Management<br />for African Schools 🏫
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Register students, manage teachers, track attendance — all in one fast, affordable, mobile-friendly platform.
          </p>
          <Button size="lg" className="gradient-accent text-accent-foreground font-semibold px-8" onClick={() => navigate("/auth")}>
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="container max-w-5xl py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: "Student Registration", desc: "Add students in seconds with auto-generated IDs, CSV import/export, and parent info." },
            { icon: School, title: "Multi-School Support", desc: "Manage multiple schools from one dashboard with role-based access control." },
            { icon: ShieldCheck, title: "Secure & Scalable", desc: "Enterprise-grade security with row-level policies. Scales to 100k+ students." },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-shadow text-center">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026 All Rights Reserved – Gem School Management
      </footer>
    </div>
  );
}

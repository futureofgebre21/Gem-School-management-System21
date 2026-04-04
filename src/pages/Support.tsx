import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageCircle, Send } from "lucide-react";

const contacts = [
  { icon: Mail, label: "Email", value: "gemschoolmanagementapp@gmail.com", href: "mailto:gemschoolmanagementapp@gmail.com" },
  { icon: Send, label: "Telegram", value: "@gemschool21", href: "https://t.me/gemschool21" },
  { icon: MessageCircle, label: "WhatsApp", value: "+125 953071795", href: "https://wa.me/125953071795" },
  { icon: Phone, label: "Phone", value: "0953071795", href: "tel:0953071795" },
];

export default function Support() {
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support & Contact</h1>
        <p className="text-sm text-muted-foreground">Need help? Reach out to us through any of the channels below.</p>
      </div>
      <div className="space-y-3">
        {contacts.map(c => (
          <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer">
            <Card className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer mb-3">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <c.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="font-medium text-foreground">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

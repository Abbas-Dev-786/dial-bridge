import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Phone className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {sent ? "Check your email" : "Reset password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sent
              ? `We sent a reset link to ${email}`
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-success/10 p-4">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => setSent(true)}>Send Reset Link</Button>
            <Button variant="ghost" asChild className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

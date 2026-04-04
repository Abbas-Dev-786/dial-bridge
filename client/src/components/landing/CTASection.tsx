import { ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <div className="rounded-2xl border bg-card p-10 sm:p-14 shadow-lg shadow-primary/5">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            Ready to scale your outreach?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Join 500+ companies using DialBridge to automate their calling
            operations. Start your free trial today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 px-8"
              onClick={() => navigate("/signup")}
            >
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8"
              onClick={() => navigate("/login")}
            >
              Talk to Sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

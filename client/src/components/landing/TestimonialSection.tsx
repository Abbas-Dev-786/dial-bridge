import { Badge } from "../ui/badge";
import { TESTIMONIALS } from "@/lib/constants";
import { Card, CardContent } from "../ui/card";
import { Star } from "lucide-react";
import { Separator } from "../ui/separator";

const TestimonialSection = () => {
  return (
    <section id="testimonials" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
            Testimonials
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Loved by sales teams everywhere
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card
              key={t.author}
              className="border-border/60 hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-warning text-warning"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  "{t.quote}"
                </p>
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;

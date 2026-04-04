import { LOGOS } from "@/lib/constants";

const LogoSection = () => {
  return (
    <section className="border-y bg-muted/30 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-8">
          Trusted by 500+ companies worldwide
        </p>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-lg font-display font-semibold text-muted-foreground/50"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoSection;

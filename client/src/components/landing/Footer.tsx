import { FOOTER_LINKS } from "@/lib/constants";
import { Separator } from "@radix-ui/react-separator";
import { Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Phone className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">DialBridge</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered voice agents for modern sales teams.
            </p>
          </div>
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <p className="font-medium text-sm mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <p className="text-xs text-muted-foreground text-center">
          © 2026 DialBridge. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

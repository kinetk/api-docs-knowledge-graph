import { brand } from "@/config/brand";
import { content } from "@/lib/data";

export function SiteFooter() {
  return (
    <footer className="border-t border-line pb-17.5 pt-12.5">
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- branding logo can be any asset in public/
          <img src={brand.logo} alt={brand.name} className="h-5 w-auto" />
        ) : (
          <span className="font-display text-[15px] italic text-muted">
            {brand.name}
          </span>
        )}
        <a
          href={`mailto:${brand.contact.email}`}
          className="font-mono text-[11.5px] text-faint transition-colors hover:text-ink"
        >
          {brand.contact.email}
        </a>
        <a
          href={brand.contact.url}
          className="font-mono text-[11.5px] text-faint transition-colors hover:text-ink"
        >
          {brand.contact.url.replace(/^https?:\/\//, "")}
        </a>
      </div>
      <p className="max-w-190 text-[12.5px] leading-[1.75] text-faint">
        {content.footer}
      </p>
    </footer>
  );
}

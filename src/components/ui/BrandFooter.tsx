import Image from 'next/image';

type BrandFooterProps = {
  compact?: boolean;
};

export function BrandFooter({ compact = false }: BrandFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`mx-auto mt-1 w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur ${compact ? 'max-w-6xl px-3 py-2' : 'max-w-7xl px-4 py-2.5'}`}
    >
      <div
        className={`flex max-w-full flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left ${compact ? 'sm:gap-2' : 'sm:gap-2.5'}`}
      >
        <p
          className={`max-w-full break-words font-semibold text-slate-500 ${compact ? 'text-[10px] leading-4' : 'text-[11px] leading-4 sm:text-xs'}`}
        >
          Copyright {'\u00A9'} {year} CosmicAbyss. All rights reserved.
        </p>

        <div
          className={`flex max-w-full items-center justify-center gap-2 ${compact ? 'sm:gap-1.5' : 'sm:gap-2'}`}
        >
          <span
            className={`shrink-0 font-semibold uppercase tracking-wider text-slate-500 ${compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'}`}
          >
            Powered by
          </span>
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white ${compact ? 'h-6 w-20 px-1.5' : 'h-7 w-24 px-2'}`}
          >
            <Image
              src="/imago.png"
              alt="Imago"
              width={96}
              height={28}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

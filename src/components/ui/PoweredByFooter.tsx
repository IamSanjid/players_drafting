import Image from 'next/image';

type PoweredByFooterProps = {
  compact?: boolean;
};

export function PoweredByFooter({ compact = false }: PoweredByFooterProps) {
  return (
    <footer
      className={`mx-auto mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur ${compact ? 'max-w-6xl px-3 py-2' : 'max-w-7xl px-4 py-2.5'}`}
    >
      <div
        className={`flex flex-wrap items-center justify-center text-center sm:justify-end ${compact ? 'gap-1.5' : 'gap-2'}`}
      >
        <span
          className={`font-semibold uppercase tracking-wider text-slate-500 ${compact ? 'text-[11px]' : 'text-xs'}`}
        >
          Powered by
        </span>
        <div
          className={`flex items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white ${compact ? 'h-6 w-20 px-1.5' : 'h-7 w-24 px-2'}`}
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
    </footer>
  );
}

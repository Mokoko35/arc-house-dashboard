/** Placeholder cards with a shimmer, shown while lists and catalogs load. */
export function SkeletonGrid({ poster, count = 18, className }: { poster: boolean; count?: number; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className={`skeleton rounded-2xl border border-white/5 ${poster ? 'aspect-[2/3]' : 'aspect-video'}`} />
          <div className="skeleton mt-2 h-3 w-3/4 rounded" />
          <div className="skeleton mt-1.5 h-2.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

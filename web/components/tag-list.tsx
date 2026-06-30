export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="rounded-sm border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-muted">
          #{tag}
        </span>
      ))}
    </div>
  );
}

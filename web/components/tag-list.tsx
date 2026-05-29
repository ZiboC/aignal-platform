export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-panel px-2.5 py-1 text-xs font-semibold text-muted">
          #{tag}
        </span>
      ))}
    </div>
  );
}

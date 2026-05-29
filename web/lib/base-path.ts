export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(path: string | null) {
  if (!path) return null;
  if (!path.startsWith("/")) return path;
  return `${basePath}${path}`;
}

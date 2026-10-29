const parts = (path: string) => path.split(/[\\/]/).filter(Boolean);

/** File names, with the parent folder appended only where two open tabs would look identical. */
export function tabLabels(paths: string[]): Record<string, string> {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const name = parts(p).pop() ?? p;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const labels: Record<string, string> = {};
  const webTabs = paths.filter((p) => p.startsWith('web:'));
  for (const p of paths) {
    if (p.startsWith('web:')) {
      labels[p] = webTabs.length > 1 ? `Web ${p.slice(4)}` : 'Web';
      continue;
    }
    const segments = parts(p);
    const name = segments.pop() ?? p;
    const parent = segments.pop();
    labels[p] = (counts.get(name) ?? 0) > 1 && parent ? `${name} — ${parent}` : name;
  }
  return labels;
}

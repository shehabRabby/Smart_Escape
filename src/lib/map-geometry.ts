import type { BuildingNode } from "./building-types.ts";

/** Fit the supplied geometry uniformly; divide by span before scaling to avoid overflow. */
export function fitCoordinates(nodes: readonly BuildingNode[]): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();
  const magnitude = Math.max(...nodes.flatMap(node => [Math.abs(node.x), Math.abs(node.y)])) || 1;
  const xs = nodes.map(node => node.x / magnitude), ys = nodes.map(node => node.y / magnitude);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  const span = Math.max(spanX, spanY) || 1;
  const width = spanX / span, height = spanY / span;
  const scale = width === 0 && height === 0 ? 1 : Math.min(width ? 760 / width : Infinity, height ? 380 / height : Infinity);
  return new Map(nodes.map((node, index) => [node.id, {
    x: 120 + (760 - width * scale) / 2 + ((xs[index] - minX) / span) * scale,
    y: 100 + (380 - height * scale) / 2 + ((ys[index] - minY) / span) * scale,
  }]));
}

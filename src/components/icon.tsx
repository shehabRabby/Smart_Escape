type IconName = "shield" | "upload" | "arrow" | "pin" | "exit" | "check" | "warning" | "file" | "layers" | "close";
const paths: Record<IconName, string> = {
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z M9 12l2 2 4-4",
  upload: "M12 16V3 M7 8l5-5 5 5 M4 15v5h16v-5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  exit: "M10 4H4v16h6 M10 12h11 M16 7l5 5-5 5",
  check: "M5 12l4 4L19 6",
  warning: "M12 3 2 21h20L12 3Z M12 9v5 M12 17v.1",
  file: "M14 3H5v18h14V8l-5-5Z M14 3v5h5 M8 12h8 M8 16h5",
  layers: "m12 3 10 5-10 5L2 8l10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5",
  close: "m6 6 12 12 M18 6 6 18",
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

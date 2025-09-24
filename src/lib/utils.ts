// Utility to conditionally join class names (minimal replacement for clsx + tailwind-merge)
export function cn(
  ...inputs: Array<
    | string
    | number
    | undefined
    | null
    | false
    | Record<string, boolean | undefined | null>
  >
): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}

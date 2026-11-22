/** Share what the user is writing with Felt AI (Composer calls this). */
export function setMascotContext(text: string) {
  if (typeof window !== "undefined") (window as unknown as { __feltContext?: string }).__feltContext = text;
}
export const getMascotContext = () => (typeof window !== "undefined" ? (window as unknown as { __feltContext?: string }).__feltContext : undefined);

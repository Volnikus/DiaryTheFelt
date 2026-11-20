export const OWNER_COOKIE = "felt_diary";
export const DEMO_OWNER = "demo";

export function isValidOwner(value: string): boolean {
  return /^[a-f0-9]{40}$/.test(value);
}

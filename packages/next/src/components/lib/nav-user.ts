export function getAvatarUrl(email: string | null | undefined): string {
  if (!email) return "";
  return `https://vercel.com/api/www/avatar?s=64&u=${email}`;
}
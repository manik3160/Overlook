// Field work happens in India: show and group times in IST regardless of the server's timezone.
const TZ = "Asia/Kolkata"

export const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)) // YYYY-MM-DD
export const formatTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" })
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: TZ, dateStyle: "medium" })

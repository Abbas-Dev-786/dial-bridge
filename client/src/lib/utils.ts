import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCentsToDollars(cents: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatSecondsToDuration(seconds: number = 0): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(date));
}

/**
 * Extracts a human-readable error message from an API error response.
 * Handles AxiosError objects, FastAPI detail strings, and FastAPI validation error arrays.
 */
export function getErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred";
  if (typeof error === "string") return error;

  // Handle Axios response error
  const responseData = error?.response?.data;
  if (responseData) {
    const detail = responseData.detail;

    // Case 1: detail is a string (FastAPI standard)
    if (typeof detail === "string") return detail;

    // Case 2: detail is an array (FastAPI validation errors)
    if (Array.isArray(detail)) {
      return detail
        .map((d: any) => {
          if (typeof d === "string") return d;
          if (d?.msg) {
            // Include field name if available in loc
            const field = d.loc?.slice(1).join(".") || "";
            return field ? `${field}: ${d.msg}` : d.msg;
          }
          return JSON.stringify(d);
        })
        .join(", ");
    }

    // Case 3: other data formats
    return responseData.message || responseData.error || error.message || "An unexpected error occurred";
  }

  // Fallback to error.message
  return error.message || "An unexpected error occurred";
}

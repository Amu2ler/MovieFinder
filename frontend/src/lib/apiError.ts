interface FastApiValidationItem {
  msg?: string;
}

interface ApiErrorShape {
  response?: { data?: { detail?: unknown } };
}

export function extractApiError(err: unknown, fallback: string): string {
  const detail = (err as ApiErrorShape)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as FastApiValidationItem | undefined;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return fallback;
}

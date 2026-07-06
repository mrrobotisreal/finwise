// The single fetch wrapper for finwise-api. Every call attaches the Firebase ID
// token, parses JSON, throws a typed ApiError on non-2xx, and validates the
// response with a caller-supplied zod schema.
import type { z } from "zod";
import { auth } from "@/integrations/firebase/client";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === "string") return e;
  }
  return fallback;
}

type RequestInitLite = {
  method: string;
  body?: BodyInit;
  json?: unknown;
  isForm?: boolean;
};

async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInitLite): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeaders()) };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${BASE_URL}${path}`, { method: init.method, headers, body });
  const data = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data, res.statusText || "Request failed"));
  }
  return schema.parse(data);
}

export function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return request(path, schema, { method: "GET" });
}

export function apiPost<T>(path: string, schema: z.ZodType<T>, json?: unknown): Promise<T> {
  return request(path, schema, { method: "POST", json: json ?? {} });
}

export function apiPatch<T>(path: string, schema: z.ZodType<T>, json?: unknown): Promise<T> {
  return request(path, schema, { method: "PATCH", json: json ?? {} });
}

export function apiDelete<T>(path: string, schema: z.ZodType<T>, json?: unknown): Promise<T> {
  return request(path, schema, { method: "DELETE", json: json ?? {} });
}

// apiUpload posts multipart/form-data with a single "file" field. Content-Type
// is left unset so the browser adds the multipart boundary.
export function apiUpload<T>(path: string, schema: z.ZodType<T>, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return request(path, schema, { method: "POST", body: form, isForm: true });
}

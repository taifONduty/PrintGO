// Typed fetch wrappers for the Go API.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type FileKind = "doc" | "img";

export interface FileItem {
  id: string;
  job_id: string;
  original_filename: string;
  file_path: string;
  file_mime: string;
  page_count: number;
  kind: FileKind;
  sort_order: number;
}

export interface Job {
  id: string;
  machine_id: string;
  page_count: number; // aggregate across files
  color: boolean;
  copies: number;
  duplex: boolean;
  page_range_from: number | null;
  page_range_to: number | null;
  price_taka: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  files: FileItem[];
}

export type JobStatus =
  | "created"
  | "pending_payment"
  | "paid"
  | "queued"
  | "printing"
  | "completed"
  | "failed";

export interface JobConfig {
  color: boolean;
  copies: number;
  duplex: boolean;
  page_range_from: number | null;
  page_range_to: number | null;
}

export interface StatusResult {
  status: JobStatus;
  message: string;
}

/** ApiError carries a human-readable message from the API error envelope. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let message = `Request failed (${res.status}).`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // non-JSON error body; keep default message
  }
  throw new ApiError(message, res.status);
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

// Shared XHR multipart upload (fetch lacks upload progress).
function xhrUpload(url: string, file: File, machineId: string | null, onProgress?: (pct: number) => void): Promise<Job> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (machineId) form.append("machine_id", machineId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as Job);
        } catch {
          reject(new ApiError("Malformed server response.", xhr.status));
        }
      } else {
        let message = `Upload failed (${xhr.status}).`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error) message = body.error;
        } catch {
          /* keep default */
        }
        reject(new ApiError(message, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("Network error during upload.", 0));
    xhr.send(form);
  });
}

/** Create a new job with its first file. */
export function uploadFile(file: File, machineId: string, onProgress?: (pct: number) => void): Promise<Job> {
  return xhrUpload(`${API_URL}/api/upload`, file, machineId, onProgress);
}

/** Add another file to an existing job. */
export function addFile(jobId: string, file: File, onProgress?: (pct: number) => void): Promise<Job> {
  return xhrUpload(`${API_URL}/api/jobs/${jobId}/files`, file, null, onProgress);
}

/** Remove a file from a job. */
export async function removeFile(jobId: string, fileId: string): Promise<Job> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/files/${fileId}`, { method: "DELETE" });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<Job>;
}

export function getJob(jobId: string): Promise<Job> {
  return getJSON<Job>(`/api/jobs/${jobId}`);
}

export async function updateConfig(jobId: string, cfg: JobConfig): Promise<Job> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<Job>;
}

export async function initPayment(jobId: string): Promise<{ gateway_url: string }> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<{ gateway_url: string }>;
}

export function getStatus(jobId: string): Promise<StatusResult> {
  return getJSON<StatusResult>(`/api/jobs/${jobId}/status`);
}

/** URL that streams a file's print-ready PDF inline (download / open in tab). */
export function fileContentUrl(jobId: string, fileId: string): string {
  return `${API_URL}/api/jobs/${jobId}/files/${fileId}/content`;
}

/** URL of a rasterised PNG of a 1-based page (renders inline on every browser). */
export function filePageUrl(jobId: string, fileId: string, page = 1): string {
  return `${API_URL}/api/jobs/${jobId}/files/${fileId}/page/${page}`;
}

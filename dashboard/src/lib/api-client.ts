"use client";

/** Thin fetch helper for React Query mutations. */
export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; form?: FormData } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? "POST",
    headers: options.form ? undefined : { "Content-Type": "application/json" },
    body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Trigger a browser download for a URL (keeps the anchor out of component markup). */
export function downloadUrl(url: string, filename?: string) {
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Print a file in a hidden iframe; falls back to opening a new tab if blocked. */
export function printUrl(url: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(url, "_blank", "noopener");
    }
    window.setTimeout(() => iframe.remove(), 60_000);
  };
  document.body.appendChild(iframe);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const TOKEN_KEY = "career-investment-token";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const requestBody: BodyInit | undefined = isFormData
    ? (options.body as FormData)
    : options.body === undefined
      ? undefined
      : JSON.stringify(options.body);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: requestBody,
    });
  } catch (error) {
    throw new Error(
      `无法连接后端 ${API_BASE_URL}${path}。请确认后端服务已启动、端口可访问，且前端 .env.local 指向正确。`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const details = await readResponse(response);
    const message =
      typeof details === "object" && details && "message" in details
        ? String((details as { message: unknown }).message)
        : `API request failed with ${response.status}`;
    throw new ApiError(response.status, message, details);
  }

  return readResponse(response) as Promise<T>;
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

import { type v1 } from "moos-api";
import fetch, { Response, RequestInit } from "node-fetch";

let csrfToken: string | null = null;

export async function fetchProfile(): Promise<v1.UserProfile | null> {
  return _csrfFetch("/profile", undefined, { method: "POST" }).then((response) => response.json());
}

export async function patchProfile(parameters: v1.operations["patch-profile"]["requestBody"]["content"]["application/json"]): Promise<boolean> {
  return _csrfFetch("/profile", parameters, { method: "PATCH" }).then((response) => response.ok);
}

export async function requestSessionCookie(idToken: string): Promise<boolean> {
  const body: v1.operations["request-session"]["requestBody"]["content"]["application/json"] = {
    token: idToken
  };
  return _csrfFetch("/session", body, { method: "POST" }).then((response) => response.ok);
}

export async function revokeSessionCookie(): Promise<boolean> {
  return _csrfFetch("/session", undefined, { method: "DELETE" }).then((response) => response.ok);
}

export async function requestCSRFToken(): Promise<Response> {
  return _fetch("/csrf-token", undefined, { method: "GET" });
}

export async function testCSRFToken(): Promise<Response> {
  return _csrfFetch("/csrf-token", undefined, { method: "POST" });
}

async function _csrfFetch(endpoint: keyof v1.paths, body?: object, init?: RequestInit, retry = true): Promise<Response> {
  if (!csrfToken) {
    csrfToken = (await (await requestCSRFToken()).json())._csrf;
  }
  const response = await _fetch(endpoint, body, {
    ...init,
    headers: {
      "CSRF-Token": csrfToken ?? "",
      ...init?.headers
    }
  });
  if (response.status === 403 && retry) {
    csrfToken = (await (await requestCSRFToken()).json())._csrf;
    return _csrfFetch(endpoint, body, init, false);
  }
  return response;
}

async function _fetch(endpoint: keyof v1.paths, body?: object, init?: RequestInit): Promise<Response> {
  return fetch(`${process.env.API_SERVER ?? "https://moos.wolkeneis.dev"}/api/v1${endpoint}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie: `session=${process.env.SESSION_COOKIE};`,
      ...init?.headers
    }
  });
}

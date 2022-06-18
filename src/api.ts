import cookie from "cookie";
import { type v1 } from "moos-api";
import fetch, { RequestInit, Response } from "node-fetch";

let csrfToken: string | null = null;
let csrfCookie: string | null = null;

export async function createCollection(
  options: v1.operations["put-profile-collection"]["requestBody"]["content"]["application/json"]
): Promise<v1.SeasonGroup | null> {
  return ((await _csrfFetch("/profile/collection", options, { method: "PUT" }).then((response) => response.json())) as v1.SeasonGroup) ?? null;
}

export async function createSeason(
  options: v1.operations["put-profile-list"]["requestBody"]["content"]["application/json"]
): Promise<v1.Season | null> {
  return ((await _csrfFetch("/profile/list", options, { method: "PUT" }).then((response) => response.json())) as v1.Season) ?? null;
}

export async function createEpisode(
  options: v1.operations["put-profile-episode"]["requestBody"]["content"]["application/json"]
): Promise<v1.Episode | null> {
  return ((await _csrfFetch("/profile/episode", options, { method: "PUT" }).then((response) => response.json())) as v1.Episode) ?? null;
}

export async function createSource(
  options: v1.operations["put-profile-source"]["requestBody"]["content"]["application/json"]
): Promise<v1.Source | null> {
  return ((await _csrfFetch("/profile/source", options, { method: "PUT" }).then((response) => response.json())) as v1.Source) ?? null;
}

export async function createFile(
  options: v1.operations["put-profile-file"]["requestBody"]["content"]["application/json"]
): Promise<v1.operations["put-profile-file"]["responses"]["200"]["content"]["application/json"] | null> {
  return (
    ((await _csrfFetch("/profile/file", options, { method: "PUT" }).then((response) =>
      response.json()
    )) as v1.operations["put-profile-file"]["responses"]["200"]["content"]["application/json"]) ?? null
  );
}

export async function deleteFile(options: v1.operations["delete-profile-file"]["requestBody"]["content"]["application/json"]): Promise<boolean> {
  return (await _csrfFetch("/profile/file", options, { method: "DELETE" }).then((response) => response.ok)) ?? false;
}

export async function fetchProfile(): Promise<v1.UserProfile | null> {
  return ((await _csrfFetch("/profile", undefined, { method: "POST" }).then((response) => response.json())) as v1.UserProfile) ?? null;
}

export async function requestCSRFToken(): Promise<Response> {
  return _fetch("/csrf-token", undefined, { method: "GET" });
}

async function _csrfFetch(endpoint: keyof v1.paths, body?: object, init?: RequestInit, retry = true): Promise<Response> {
  if (!csrfToken) {
    const response = await requestCSRFToken();
    csrfCookie = cookie.parse(response.headers.get("set-cookie") ?? "")._csrf;
    csrfToken = ((await response.json()) as v1.operations["get-csrf-token"]["responses"]["200"]["content"]["application/json"])._csrf;
  }
  const response = await _fetch(endpoint, body, {
    ...init,
    headers: {
      "CSRF-Token": csrfToken ?? "",
      ...init?.headers
    }
  });
  if (response.status === 403 && retry) {
    const response = await requestCSRFToken();
    csrfCookie = cookie.parse(response.headers.get("set-cookie") ?? "")._csrf;
    csrfToken = ((await response.json()) as v1.operations["get-csrf-token"]["responses"]["200"]["content"]["application/json"])._csrf;
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
      cookie: `${process.env.SESSION_COOKIE ? `${cookie.serialize("session", process.env.SESSION_COOKIE)};` : ""} ${
        csrfCookie ? `${cookie.serialize("_csrf", csrfCookie)};` : ""
      }`,
      ...init?.headers
    }
  });
}

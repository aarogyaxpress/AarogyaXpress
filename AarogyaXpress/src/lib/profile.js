import { auth } from "../firebase";

async function profileRequest(method, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again to continue.");
  const token = await user.getIdToken();
  const response = await fetch("/api/profile", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Profile service is unavailable.");
  return result;
}

export function getProfileStatus() {
  return profileRequest("GET");
}

export function saveProfile(profile) {
  return profileRequest("POST", profile);
}

export function ensureProfileRecord(user) {
  return profileRequest("POST", {
    name: user.displayName || "New User",
    email: user.email || null,
  });
}

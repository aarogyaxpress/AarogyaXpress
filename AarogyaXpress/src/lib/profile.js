import { auth } from "../firebase";

const profileStatusKey = (uid) => `aarogya_profile_completed_${uid}`;

async function profileRequest(method, body) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again to continue.");
  const token = await user.getIdToken();
  try {
    const response = await fetch("/api/profile", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (method === "GET" && response.status >= 500) {
        const cachedStatus = localStorage.getItem(profileStatusKey(user.uid));
        if (cachedStatus !== null) return { profile_completed: cachedStatus === "true", offline: true };
      }
      if (method === "POST" && !body?.profile_completed && response.status >= 500) {
        const cachedStatus = localStorage.getItem(profileStatusKey(user.uid));
        return { profile_completed: cachedStatus === "true", offline: true };
      }
      throw new Error(result.error || "Profile service is unavailable.");
    }
    if (typeof result.profile_completed === "boolean") {
      localStorage.setItem(profileStatusKey(user.uid), String(result.profile_completed));
    }
    return result;
  } catch (error) {
    if (method === "GET") {
      const cachedStatus = localStorage.getItem(profileStatusKey(user.uid));
      if (cachedStatus !== null) return { profile_completed: cachedStatus === "true", offline: true };
    }
    if (method === "POST" && !body?.profile_completed) {
      const cachedStatus = localStorage.getItem(profileStatusKey(user.uid));
      return { profile_completed: cachedStatus === "true", offline: true };
    }
    throw error;
  }
}

export function getProfileStatus() {
  return profileRequest("GET");
}

export function getProfileData() {
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

import { auth } from "../firebase";

async function request(path = "/api/health-records", options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again to sync your health records.");
  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not sync your health records.");
  return result;
}

export function getHealthRecords() { return request(); }

export function saveHealthReport(report) {
  return request("/api/health-records", { method: "POST", body: JSON.stringify({ type: "report", report }) });
}

export function logHealthActivity(activity) {
  return request("/api/health-records", { method: "POST", body: JSON.stringify({ type: "activity", activity }) });
}

export function deleteHealthReport(id) {
  return request(`/api/health-records?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

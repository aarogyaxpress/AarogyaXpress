import { auth } from "../firebase";

const CACHE_KEY = "aarogya_ambulance_catalog_v1";

export function readCachedAmbulanceCatalog() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); }
  catch { return null; }
}

export async function fetchAmbulanceCatalog() {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const response = await fetch("/api/ambulance", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not load ambulance information.");
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch { /* Catalog remains usable if storage is unavailable. */ }
  return result;
}

export async function saveAmbulanceRequest({ ambulanceTypeId, emergencyNumber = "108" }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to save this request. You can still call emergency services.");
  const token = await user.getIdToken();
  const response = await fetch("/api/ambulance", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ambulance_type_id: ambulanceTypeId, emergency_number: emergencyNumber }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not save the SOS request.");
  return result;
}

export async function cancelAmbulanceRequest(id) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in again to update this saved SOS request.");
  const token = await user.getIdToken();
  const response = await fetch("/api/ambulance", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not cancel the saved SOS request.");
  return result;
}

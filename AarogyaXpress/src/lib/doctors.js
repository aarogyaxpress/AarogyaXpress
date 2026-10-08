import { auth } from "../firebase";

async function request(path = "/api/doctors", options = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not connect to the doctor service.");
  return result;
}

export function getDoctorDirectory() { return request(); }

export function requestDoctorAppointment(appointment) {
  return request("/api/doctors", { method: "POST", body: JSON.stringify(appointment) });
}

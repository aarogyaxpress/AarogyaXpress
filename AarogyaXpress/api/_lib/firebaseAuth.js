const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCJ686_Ir--GInCc2SUXBKZJ4GITDjDOUY";

export async function verifyFirebaseToken(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!response.ok) return null;
  const result = await response.json();
  const user = result.users?.[0];
  if (!user || user.localId === undefined || user.disabled) return null;
  return user.localId;
}

export async function authenticatedUserId(req) {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return null;
  return verifyFirebaseToken(idToken).catch(() => null);
}

import { auth } from "../firebase";

export async function generateGeminiText(parts) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to use AI analysis.");

  const token = await user.getIdToken();
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ parts }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "AI analysis is unavailable.");
  return result.text;
}

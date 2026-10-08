import { createClient } from "@supabase/supabase-js";
import { authenticatedUserId } from "./_lib/firebaseAuth.js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body || {};
}

function profileDatabaseError(action, error) {
  console.error(`[api/profile] ${action} failed`, {
    code: error?.code || "unknown",
    message: error?.message || "Unknown Supabase error",
  });
  if (error?.code === "42703" || error?.code === "42P01") {
    return {
      status: 503,
      message: "The Supabase profile schema is incomplete. Apply supabase/migrations/20261008_profile_setup.sql in the Supabase SQL Editor.",
    };
  }
  if (error?.code === "42P10") {
    return {
      status: 503,
      message: "Supabase needs a unique constraint on users.firebase_uid. Apply the project schema migration.",
    };
  }
  if (/fetch failed|networkerror|enotfound|econnrefused/i.test(error?.message || "")) {
    return {
      status: 503,
      message: "Supabase is unreachable. Check that the project is active and the server key is valid, then retry.",
    };
  }
  return { status: 502, message: "Could not save your profile. Check the Supabase server key and connection." };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const firebaseUid = await authenticatedUserId(req);
  if (!firebaseUid) return res.status(401).json({ error: "Your session expired. Sign in again." });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: "Supabase server configuration is missing. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Vercel." });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,phone,location,age,gender,blood_group,weight,height,allergies,chronic_diseases,emergency_name,emergency_contact,profile_completed")
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();
    if (error) {
      const failure = profileDatabaseError("profile read", error);
      return res.status(failure.status).json({ error: failure.message });
    }
    return res.status(200).json({ ...data, profile_completed: Boolean(data?.profile_completed) });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid profile data." });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (body.profile_completed !== true) {
    const { data, error } = await supabase
      .from("users")
      .upsert({
        firebase_uid: firebaseUid,
        name: name || "New User",
        email: typeof body.email === "string" ? body.email.trim().slice(0, 254) : null,
      }, { onConflict: "firebase_uid" })
      .select("profile_completed")
      .single();
    if (error) {
      const failure = profileDatabaseError("profile creation", error);
      return res.status(failure.status).json({ error: failure.message });
    }
    return res.status(200).json({ profile_completed: Boolean(data?.profile_completed) });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 20) : "";
  const age = Number(body.age);
  const height = body.height == null || body.height === "" ? null : Number(body.height);
  const weight = body.weight == null || body.weight === "" ? null : Number(body.weight);
  const allowedGenders = ["Male", "Female", "Other"];
  const allowedBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  if (!name || !/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ""))) {
    return res.status(400).json({ error: "Enter your name and a valid phone number." });
  }
  if (!Number.isInteger(age) || age < 1 || age > 120 || !allowedGenders.includes(body.gender) || !allowedBloodGroups.includes(body.blood_group)) {
    return res.status(400).json({ error: "Check your age, gender, and blood group." });
  }
  if ((height !== null && (!Number.isFinite(height) || height < 30 || height > 300)) || (weight !== null && (!Number.isFinite(weight) || weight < 1 || weight > 700))) {
    return res.status(400).json({ error: "Check your height and weight values." });
  }

  const payload = {
    firebase_uid: firebaseUid,
    name,
    email: typeof body.email === "string" ? body.email.trim().slice(0, 254) : null,
    phone,
    location: typeof body.location === "string" ? body.location.trim().slice(0, 160) : null,
    age,
    gender: body.gender,
    blood_group: body.blood_group,
    allergies: typeof body.allergies === "string" ? body.allergies.trim().slice(0, 2000) : null,
    chronic_diseases: typeof body.chronic_diseases === "string" ? body.chronic_diseases.trim().slice(0, 2000) : null,
    emergency_name: typeof body.emergency_name === "string" ? body.emergency_name.trim().slice(0, 120) : null,
    emergency_contact: typeof body.emergency_contact === "string" ? body.emergency_contact.trim().slice(0, 20) : null,
    height,
    weight,
    profile_completed: true,
  };

  const { error } = await supabase.from("users").upsert(payload, { onConflict: "firebase_uid" });
  if (error) {
    const failure = profileDatabaseError("profile save", error);
    return res.status(failure.status).json({ error: failure.message });
  }
  return res.status(200).json({ profile_completed: true });
}

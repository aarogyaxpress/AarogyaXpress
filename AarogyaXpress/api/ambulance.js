import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { authenticatedUserId } from "./_lib/firebaseAuth.js";

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bodyOf(req) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body || {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const supabase = getAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase server configuration is missing." });

  if (req.method === "GET") {
    const [types, hospitals, emergencyContacts] = await Promise.all([
      supabase.from("ambulance_types").select("id,label,description,icon,eta_minutes,price_min,price_max,is_sample,sort_order").eq("is_active", true).order("sort_order"),
      supabase.from("ambulance_hospitals").select("id,name,city,address,website,phone,source_url,has_emergency_department,is_sample,sort_order").eq("city", "Dehradun").eq("is_active", true).order("sort_order"),
      supabase.from("ambulance_emergency_contacts").select("id,label,phone,icon,sort_order").eq("is_active", true).order("sort_order"),
    ]);
    const failure = types.error || hospitals.error || emergencyContacts.error;
    if (failure) {
      console.error("[api/ambulance] catalog read failed", failure.code, failure.message);
      return res.status(503).json({ error: "Ambulance directory is not installed. Apply the ambulance catalog and Dehradun hospital migrations in Supabase." });
    }
    const firebaseUid = await authenticatedUserId(req);
    let requests = [];
    if (firebaseUid) {
      const { data, error } = await supabase.from("ambulance_requests")
        .select("id,ambulance_type_id,ambulance_type_label,emergency_number,status,created_at")
        .eq("firebase_uid", firebaseUid).order("created_at", { ascending: false }).limit(20);
      if (error) {
        console.error("[api/ambulance] request history read failed", error.code, error.message);
        return res.status(503).json({ error: "Could not load your saved SOS request." });
      }
      requests = data || [];
    }
    return res.status(200).json({ ambulanceTypes: types.data || [], hospitals: hospitals.data || [], emergencyContacts: emergencyContacts.data || [], requests });
  }

  const firebaseUid = await authenticatedUserId(req);
  if (!firebaseUid) return res.status(401).json({ error: "Sign in to save an SOS request. You can still call 108 or 112." });
  let body;
  try { body = bodyOf(req); } catch { return res.status(400).json({ error: "Invalid request body." }); }

  if (req.method === "PATCH") {
    const requestId = typeof body.id === "string" ? body.id : "";
    if (!requestId) return res.status(400).json({ error: "An SOS request id is required." });
    const { data, error } = await supabase.from("ambulance_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId).eq("firebase_uid", firebaseUid).eq("status", "request_logged")
      .select("id,status").maybeSingle();
    if (error) {
      console.error("[api/ambulance] request cancel failed", error.code, error.message);
      return res.status(503).json({ error: "Could not cancel the saved SOS log." });
    }
    if (!data) return res.status(404).json({ error: "The SOS request was not found or is already closed." });
    return res.status(200).json(data);
  }

  const emergencyNumber = String(body.emergency_number || "108");
  if (!["108", "102", "112"].includes(emergencyNumber)) return res.status(400).json({ error: "Unsupported emergency number." });

  let type = null;
  if (body.ambulance_type_id) {
    const { data, error } = await supabase.from("ambulance_types")
      .select("id,label").eq("id", String(body.ambulance_type_id)).eq("is_active", true).maybeSingle();
    if (error) {
      console.error("[api/ambulance] type lookup failed", error.code, error.message);
      return res.status(503).json({ error: "Could not verify the selected ambulance type." });
    }
    if (!data) return res.status(400).json({ error: "Choose an available ambulance type." });
    type = data;
  }

  const { data, error } = await supabase.from("ambulance_requests").insert({
    firebase_uid: firebaseUid,
    ambulance_type_id: type?.id || null,
    ambulance_type_label: type?.label || null,
    emergency_number: emergencyNumber,
    status: "request_logged",
  }).select("id,created_at,status").single();
  if (error) {
    console.error("[api/ambulance] request save failed", error.code, error.message);
    return res.status(503).json({ error: "Could not save the SOS request. Call emergency services directly." });
  }
  return res.status(201).json(data);
}

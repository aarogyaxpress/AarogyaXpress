import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { authenticatedUserId } from "./_lib/firebaseAuth.js";

const supabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
};
const bodyOf = (req) => typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const db = supabase();
  if (!db) return res.status(503).json({ error: "Supabase server configuration is missing." });

  if (req.method === "GET") {
    const [specialties, doctors] = await Promise.all([
      db.from("doctor_specialties").select("id,label,icon,sort_order").eq("active", true).order("sort_order"),
      db.from("doctors").select("id,name,specialty_id,specialty_label,experience_years,fee,rating,review_count,bio,avatar_initials,avatar_color,available_online,availability_label,is_sample").eq("active", true).order("sort_order"),
    ]);
    const failure = specialties.error || doctors.error;
    if (failure) {
      console.error("[api/doctors] directory read failed", failure.code, failure.message);
      return res.status(502).json({ error: "Doctor directory tables are missing. Run supabase/migrations/20261008_doctor_directory.sql in the Supabase SQL Editor." });
    }

    const firebaseUid = await authenticatedUserId(req);
    let appointments = [];
    if (firebaseUid) {
      const { data: user, error: userError } = await db.from("users").select("id").eq("firebase_uid", firebaseUid).maybeSingle();
      if (userError) return res.status(502).json({ error: "Could not load your profile." });
      if (user) {
        const result = await db.from("appointments").select("id,doctor_id,doctor_name,specialty,date,time,consultation_type,status,created_at").eq("user_id", user.id).in("status", ["request_pending", "scheduled"]).order("created_at", { ascending: true }).limit(50);
        if (result.error) return res.status(502).json({ error: "Could not load your appointment history." });
        appointments = result.data || [];
      }
    }
    return res.status(200).json({ specialties: specialties.data || [], doctors: doctors.data || [], appointments });
  }

  const firebaseUid = await authenticatedUserId(req);
  if (!firebaseUid) return res.status(401).json({ error: "Please sign in to request an appointment." });
  let body;
  try { body = bodyOf(req); } catch { return res.status(400).json({ error: "Invalid appointment request." }); }
  const doctorId = typeof body.doctor_id === "string" ? body.doctor_id : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const patientName = typeof body.patient_name === "string" ? body.patient_name.trim().slice(0, 120) : "";
  const patientPhone = typeof body.patient_phone === "string" ? body.patient_phone.trim().slice(0, 20) : "";
  const phoneDigits = patientPhone.replace(/\D/g, "");
  const visitType = body.consultation_type;
  const [hours, minutes] = time.split(":").map(Number);
  if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || hours > 23 || minutes > 59 || !patientName || phoneDigits.length < 10 || phoneDigits.length > 15 || !["clinic", "video"].includes(visitType)) {
    return res.status(400).json({ error: "Enter valid patient details, date, time, and consultation type." });
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || date < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ error: "Choose a valid appointment date and time." });
  }

  const [{ data: user, error: userError }, { data: doctor, error: doctorError }] = await Promise.all([
    db.from("users").select("id").eq("firebase_uid", firebaseUid).maybeSingle(),
    db.from("doctors").select("id,name,specialty_label,fee").eq("id", doctorId).eq("active", true).maybeSingle(),
  ]);
  if (userError || doctorError) return res.status(502).json({ error: "Could not verify your profile or doctor." });
  if (!user) return res.status(409).json({ error: "Your profile is not synced yet. Save your profile, then retry." });
  if (!doctor) return res.status(404).json({ error: "This doctor is no longer available." });

  const { data, error } = await db.from("appointments").insert({
    user_id: user.id,
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    specialty: doctor.specialty_label,
    date,
    time,
    consultation_type: visitType,
    patient_name: patientName,
    patient_phone: patientPhone,
    location: visitType === "clinic" ? "To be confirmed" : null,
    notes: typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) || null : null,
    status: "request_pending",
  }).select("id,doctor_id,doctor_name,specialty,date,time,consultation_type,status,created_at").single();
  if (error) {
    console.error("[api/doctors] appointment save failed", error.code, error.message);
    return res.status(502).json({ error: "Could not save your appointment request. Please try again." });
  }
  return res.status(201).json({ appointment: data, fee: doctor.fee });
}

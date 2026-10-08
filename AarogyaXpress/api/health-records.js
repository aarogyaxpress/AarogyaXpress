import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { authenticatedUserId } from "./_lib/firebaseAuth.js";

function getSupabaseAdmin() {
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
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const firebaseUid = await authenticatedUserId(req);
  if (!firebaseUid) return res.status(401).json({ error: "Your session expired. Sign in again." });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel." });

  const { data: user, error: userError } = await supabase
    .from("users").select("id").eq("firebase_uid", firebaseUid).maybeSingle();
  if (userError) {
    console.error("[api/health-records] user lookup failed", userError.code, userError.message);
    return res.status(502).json({ error: "Could not load your Supabase profile. Check the server key and users table." });
  }
  if (!user) return res.status(409).json({ error: "Your profile is not synced yet. Save your profile, then retry." });

  if (req.method === "GET") {
    const { data: links, error: linksError } = await supabase
      .from("family_links").select("linked_user_id").eq("user_id", user.id).eq("status", "accepted");
    if (linksError) {
      console.error("[api/health-records] family links read failed", linksError.code, linksError.message);
      return res.status(502).json({ error: "Could not load your linked health records." });
    }
    const userIds = [user.id, ...(links || []).map((link) => link.linked_user_id).filter(Boolean)];
    const [reports, consultations, activities] = await Promise.all([
      supabase.from("reports").select("id,file_name,patient_name,report_date,summary,overall_status,created_at,raw_json,user_id").in("user_id", userIds).order("created_at", { ascending: false }).limit(50),
      supabase.from("consultations").select("*").in("user_id", userIds).order("created_at", { ascending: false }).limit(100),
      supabase.from("activities").select("id,type,title,description,cost,status,created_at,user_id").in("user_id", userIds).order("created_at", { ascending: false }).limit(100),
    ]);
    const failure = reports.error || consultations.error || activities.error;
    if (failure) {
      console.error("[api/health-records] history read failed", failure.code, failure.message);
      return res.status(502).json({ error: "Could not load your reports and timeline. Check that the Supabase tables are installed." });
    }
    return res.status(200).json({ reports: reports.data || [], consultations: consultations.data || [], activities: activities.data || [] });
  }

  if (req.method === "DELETE") {
    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "A report id is required." });
    const { error } = await supabase.from("reports").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error("[api/health-records] report delete failed", error.code, error.message);
      return res.status(502).json({ error: "Could not delete this report." });
    }
    return res.status(200).json({ ok: true });
  }

  let body;
  try { body = bodyOf(req); } catch { return res.status(400).json({ error: "Invalid request body." }); }
  if (body.type === "report") {
    const report = body.report || {};
    if (typeof report.file_name !== "string" || !report.file_name.trim()) return res.status(400).json({ error: "A report file name is required." });
    const { data, error } = await supabase.from("reports").insert({
      user_id: user.id,
      file_name: report.file_name.slice(0, 255),
      patient_name: typeof report.patient_name === "string" ? report.patient_name.slice(0, 160) : null,
      report_date: report.report_date || null,
      summary: typeof report.summary === "string" ? report.summary.slice(0, 6000) : null,
      overall_status: typeof report.overall_status === "string" ? report.overall_status.slice(0, 80) : null,
      raw_json: report.raw_json || {},
    }).select("id").single();
    if (error) {
      console.error("[api/health-records] report save failed", error.code, error.message);
      return res.status(502).json({ error: "Your analysis finished, but the report could not be synced to Supabase." });
    }
    return res.status(201).json({ id: data.id });
  }

  if (body.type === "activity") {
    const activity = body.activity || {};
    if (typeof activity.title !== "string" || !activity.title.trim()) return res.status(400).json({ error: "An activity title is required." });
    const { error } = await supabase.from("activities").insert({
      user_id: user.id,
      type: typeof activity.type === "string" ? activity.type.slice(0, 80) : "activity",
      title: activity.title.slice(0, 160),
      description: typeof activity.description === "string" ? activity.description.slice(0, 2000) : null,
      cost: Number.isFinite(Number(activity.cost)) ? Number(activity.cost) : null,
      status: typeof activity.status === "string" ? activity.status.slice(0, 40) : null,
    });
    if (error) {
      console.error("[api/health-records] activity save failed", error.code, error.message);
      return res.status(502).json({ error: "Could not sync this activity to Supabase." });
    }
    return res.status(201).json({ ok: true });
  }

  return res.status(400).json({ error: "Unsupported health record type." });
}

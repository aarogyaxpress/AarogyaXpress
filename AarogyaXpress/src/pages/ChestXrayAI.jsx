import { useState } from "react";

const AI_SERVICE = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8001";

export default function ChestXrayAI() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setError("");
    setResult(null);
  };

  const analyze = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch(`${AI_SERVICE}/api/xray/analyze`, { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Model service is unavailable.");
      setResult(payload);
    } catch (err) {
      setError(err.message || "Could not reach the local AI service. Start ml-service/app.py and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "20px 16px 36px", maxWidth: 540, margin: "0 auto", color: "#1e2a12" }}>
      <div style={{ fontSize: 11, color: "#5a6e3a", fontWeight: 800, letterSpacing: 1 }}>AAROGYAXPRESS · RESEARCH DEMO</div>
      <h1 style={{ fontSize: 27, lineHeight: 1.12, margin: "8px 0" }}>Chest X-ray screening baseline</h1>
      <p style={{ fontSize: 13, color: "#6f7d67", lineHeight: 1.6 }}>Upload a chest X-ray to run an open-source DenseNet121 research model locally. The result contains uncalibrated model signals for demonstration and review.</p>

      <label style={{ display: "block", background: "white", border: "1px dashed #a8b99e", borderRadius: 16, padding: 16, textAlign: "center", cursor: "pointer" }}>
        {preview ? <img src={preview} alt="Selected X-ray preview" style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 8 }} /> : <div style={{ padding: 28 }}><div style={{ fontSize: 32 }}>🩻</div><b style={{ fontSize: 13 }}>Choose a chest X-ray image</b><div style={{ fontSize: 10, color: "#85917d", marginTop: 5 }}>JPG, PNG, WEBP or TIFF · processed locally</div></div>}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/tiff" onChange={e => chooseFile(e.target.files?.[0])} style={{ display: "none" }} />
      </label>
      {file && <div style={{ fontSize: 10, color: "#73816a", margin: "7px 2px" }}>{file.name}</div>}
      <button onClick={analyze} disabled={!file || busy} style={{ width: "100%", marginTop: 12, border: 0, borderRadius: 12, padding: 13, background: "#526a38", color: "white", fontWeight: 800, opacity: !file || busy ? .6 : 1 }}>
        {busy ? "Loading model and analyzing…" : "Run research baseline"}
      </button>
      {error && <div role="alert" style={{ marginTop: 12, color: "#9b3027", background: "#fff0ee", borderRadius: 10, padding: 12, fontSize: 12 }}>{error}</div>}
      {result && <div style={{ background: "white", border: "1px solid #e5e9dd", borderRadius: 16, padding: 16, marginTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Model signals · review required</div>
        <div style={{ fontSize: 10, color: "#899286", margin: "3px 0 13px" }}>{result.model}</div>
        {result.signals?.map(signal => <div key={signal.finding} style={{ margin: "11px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}><span>{signal.finding}</span><b>{signal.model_score.toFixed(3)}</b></div>
          <div style={{ background: "#edf0e8", height: 7, borderRadius: 99 }}><div style={{ width: `${Math.max(0, Math.min(100, signal.model_score * 100))}%`, height: 7, borderRadius: 99, background: "#71925b" }} /></div>
        </div>)}
        <div style={{ borderTop: "1px solid #edf0e8", paddingTop: 10, marginTop: 12, fontSize: 10, color: "#6e7867", lineHeight: 1.55 }}>{result.score_note} A qualified clinician must interpret the original image.</div>
      </div>}
    </div>
  );
}

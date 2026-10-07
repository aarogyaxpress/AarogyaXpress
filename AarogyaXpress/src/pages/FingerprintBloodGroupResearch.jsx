import { useEffect, useState } from "react";

const AI_SERVICE = import.meta.env.VITE_AI_SERVICE_URL || (import.meta.env.DEV ? "http://localhost:8001" : "");

const panel = {
  background: "#fff",
  border: "1px solid #e5e9dd",
  borderRadius: 16,
  padding: 16,
  marginTop: 14,
};

export default function FingerprintBloodGroupResearch() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    if (preview) URL.revokeObjectURL(preview);
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
      if (!AI_SERVICE) throw new Error("The model service is not configured. Set VITE_AI_SERVICE_URL in the Vercel project settings.");
      const body = new FormData();
      body.append("image", file);
      const response = await fetch(`${AI_SERVICE}/api/fingerprint/analyze`, { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Fingerprint research model is unavailable.");
      setResult(payload);
    } catch (err) {
      setError(err.message || "Could not reach the research model service.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ padding: "20px 16px 36px", maxWidth: 560, margin: "0 auto", color: "#1e2a12" }}>
      <div style={{ fontSize: 11, color: "#5a6e3a", fontWeight: 800, letterSpacing: 1 }}>
        AAROGYAXPRESS · RESEARCH DEMO
      </div>
      <h1 style={{ fontSize: 27, lineHeight: 1.12, margin: "8px 0" }}>
        Fingerprint blood-group model
      </h1>
      <p style={{ fontSize: 13, color: "#6f7d67", lineHeight: 1.65 }}>
        This connects to the ResNet50 checkpoint from the linked repository and shows its experimental class scores.
      </p>

      <section role="note" style={{ ...panel, background: "#fff8e8", borderColor: "#f2d48a" }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#654b12" }}>Research output only — not a blood-group test</div>
        <p style={{ marginTop: 7, fontSize: 12, lineHeight: 1.6, color: "#6f5b2a" }}>
          This model has not been clinically validated. A published study found no statistically significant association between fingerprint patterns and blood groups. Never use model output for transfusions, pregnancy care, emergencies, or treatment decisions. Confirm blood group with a laboratory test.
        </p>
      </section>

      <label style={{ display: "block", ...panel, borderStyle: "dashed", borderColor: "#a8b99e", textAlign: "center", cursor: "pointer" }}>
        {preview ? (
          <img src={preview} alt="Selected fingerprint research image preview" style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 8 }} />
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 32 }}>🖐️</div>
            <b style={{ fontSize: 13 }}>Choose a fingerprint image</b>
            <div style={{ fontSize: 10, color: "#85917d", marginTop: 5 }}>JPG, PNG, WEBP, or TIFF · max 15 MB</div>
          </div>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/tiff" onChange={e => chooseFile(e.target.files?.[0])} style={{ display: "none" }} />
      </label>
      {file && <div style={{ fontSize: 10, color: "#73816a", margin: "7px 2px" }}>{file.name}</div>}
      <button onClick={analyze} disabled={!file || busy} style={{ width: "100%", marginTop: 12, border: 0, borderRadius: 12, padding: 13, background: "#526a38", color: "white", fontWeight: 800, opacity: !file || busy ? .6 : 1 }}>
        {busy ? "Loading research model…" : "Run experimental model"}
      </button>
      <p style={{ margin: "8px 2px", fontSize: 10, lineHeight: 1.5, color: "#73816a" }}>
        The selected image is sent to the configured model service for in-memory processing. This app does not save it.
      </p>

      {error && <div role="alert" style={{ marginTop: 12, color: "#9b3027", background: "#fff0ee", borderRadius: 10, padding: 12, fontSize: 12 }}>{error}</div>}
      {result && <section aria-live="polite" style={panel}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Experimental model class scores</div>
        <div style={{ fontSize: 10, color: "#899286", margin: "3px 0 13px" }}>{result.model}</div>
        {result.class_scores?.map(item => (
          <div key={item.model_class} style={{ margin: "11px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span>{item.model_class}</span><b>{(item.score * 100).toFixed(1)}% model score</b>
            </div>
            <div style={{ background: "#edf0e8", height: 7, borderRadius: 99 }}>
              <div style={{ width: `${Math.max(0, Math.min(100, item.score * 100))}%`, height: 7, borderRadius: 99, background: "#71925b" }} />
            </div>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #edf0e8", paddingTop: 10, marginTop: 12, fontSize: 10, color: "#6e7867", lineHeight: 1.55 }}>
          {result.score_note} The highest score is only the model's class estimate; it does not establish your blood group.
        </div>
      </section>}

      <section style={panel}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>Project and evidence</div>
        <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6 }}>
          <a href="https://github.com/krishna111809/fingerprint-based-blood-group-detection" target="_blank" rel="noreferrer" style={{ color: "#3e642b", fontWeight: 800 }}>Original model repository ↗</a>
          <br />
          <a href="https://pubmed.ncbi.nlm.nih.gov/29453474/" target="_blank" rel="noreferrer" style={{ color: "#3e642b", fontWeight: 800 }}>Published fingerprint study ↗</a>
          <br />
          <a href="https://www.nhs.uk/tests-and-treatments/blood-groups/" target="_blank" rel="noreferrer" style={{ color: "#3e642b", fontWeight: 800 }}>Blood group testing guidance ↗</a>
        </div>
      </section>
    </main>
  );
}

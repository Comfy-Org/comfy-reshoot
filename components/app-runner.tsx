"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { estimatePivot, focalPx, invertPose, orbitPose } from "../src/lib/crossview/camera";
import { readGeometry, type Geometry } from "../src/lib/crossview/cvgeo";
import { WarpRenderer } from "../src/lib/crossview/warp-renderer";

type Output = { id: string; name: string; type: string; url: string };
type Job = { id: string; status: string; outputs: Output[]; error?: { message?: string } | string | null };

export function AppRunner() {
  const [video, setVideo] = useState<File | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "ready" | "generating">("idle");
  const [message, setMessage] = useState("Choose a 5–15 second MP4 clip.");
  const [error, setError] = useState(false);
  const [azimuth, setAzimuth] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [distance, setDistance] = useState(1);
  const [aspect, setAspect] = useState("16:9");
  const [megapixels, setMegapixels] = useState(0.4);
  const [prompt, setPrompt] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const objectUrl = useMemo(() => video ? URL.createObjectURL(video) : undefined, [video]);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  useEffect(() => {
    if (!geometry || !canvas.current) return;
    let disposed = false;
    const renderer = new WarpRenderer(canvas.current, geometry.width, geometry.height);
    createImageBitmap(geometry.jpegs[0]).then((image) => {
      if (disposed) { image.close(); return; }
      renderer.setFrame(image, geometry.depthHalf[0], geometry.depth[0]);
      const hfov = 50;
      const fx = focalPx(geometry.width, hfov);
      const pivot = estimatePivot(geometry.depth[0], geometry.width, geometry.height, fx);
      renderer.render({
        inverseTarget: invertPose(orbitPose(azimuth, elevation, distance, pivot)),
        fx,
        sourceFx: fx,
        cx: geometry.width / 2,
        cy: geometry.height / 2,
      });
      image.close();
    }).catch((cause: unknown) => {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Could not draw the camera preview.");
    });
    return () => { disposed = true; renderer.dispose(); };
  }, [geometry, azimuth, elevation, distance]);

  useEffect(() => {
    if (!job || !["queued", "running", "pending"].includes(job.status)) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}`);
        const next = await response.json() as Job & { error?: string };
        if (!response.ok) throw new Error(typeof next.error === "string" ? next.error : "Could not check job status.");
        setJob(next);
        setMessage(next.status === "queued" ? "Waiting for a GPU…" : "Comfy is running the workflow…");
      } catch (cause) {
        setError(true);
        setMessage(cause instanceof Error ? cause.message : "Could not check job status.");
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [job]);

  useEffect(() => {
    if (!job || !["succeeded", "failed", "canceled", "expired"].includes(job.status)) return;
    if (phase === "analyzing" && job.status === "succeeded") {
      const file = job.outputs.find((output) => output.name.endsWith(".cvgeo"));
      if (!file) { setError(true); setMessage("The analysis finished without a .cvgeo output."); return; }
      fetch(file.url).then((response) => {
        if (!response.ok) throw new Error("Could not download the depth preview.");
        return response.arrayBuffer();
      }).then(readGeometry).then((value) => {
        setGeometry(value);
        setPhase("ready");
        setError(false);
        setMessage("Depth is ready. Move the camera, then generate.");
      }).catch((cause: unknown) => {
        setError(true);
        setMessage(cause instanceof Error ? cause.message : "Could not read the depth preview.");
      });
    } else if (job.status === "succeeded") {
      setPhase("ready"); setError(false); setMessage("Generation finished. Preview or download a result below.");
    } else {
      const detail = typeof job.error === "string" ? job.error : job.error?.message;
      setPhase(geometry ? "ready" : "idle"); setError(true);
      setMessage(detail || `Comfy finished the job as ${job.status}.`);
    }
  }, [job, phase, geometry]);

  async function submit(step: "analyze" | "generate") {
    if (!video || phase === "analyzing" || phase === "generating") return;
    setError(false); setJob(null); setPhase(step === "analyze" ? "analyzing" : "generating");
    setMessage(step === "analyze" ? "Uploading the clip and starting depth analysis…" : "Uploading the clip and starting generation…");
    const form = new FormData();
    form.set("video", video);
    form.set("step", step);
    form.set("aspect", aspect);
    form.set("megapixels", String(megapixels));
    form.set("azimuth", String(azimuth));
    form.set("elevation", String(elevation));
    form.set("distance", String(distance));
    form.set("prompt", prompt);
    try {
      const response = await fetch("/api/jobs", { method: "POST", body: form });
      const next = await response.json() as Job & { error?: string };
      if (!response.ok) throw new Error(next.error || "Could not submit the workflow.");
      setJob(next); setMessage("Submitted to Comfy.");
    } catch (cause) {
      setPhase(geometry ? "ready" : "idle"); setError(true);
      setMessage(cause instanceof Error ? cause.message : "Could not submit the workflow.");
    }
  }

  function chooseVideo(file: File | undefined) {
    setVideo(null); setGeometry(null); setJob(null); setPhase("idle");
    if (!file) { setMessage("Choose a 5–15 second MP4 clip."); return; }
    if (file.type !== "video/mp4") { setError(true); setMessage("For this guide, choose an MP4 clip."); return; }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (probe.duration < 5 || probe.duration > 15) {
        setError(true); setMessage("This workflow accepts clips between 5 and 15 seconds."); return;
      }
      setVideo(file); setError(false); setMessage("Clip ready. Analyze depth to start.");
    };
    probe.onerror = () => { URL.revokeObjectURL(url); setError(true); setMessage("Could not read this video's duration."); };
    probe.src = url;
  }

  const results = job?.status === "succeeded" && phase === "ready"
    ? job.outputs.filter((output) => /result|original-audio|warp/i.test(output.name)) : [];

  return (
    <main className="shell">
      <header className="masthead">
        <p className="eyebrow">COMFY · API WORKFLOW GUIDE</p>
        <h1>Re-shoot<br />a video.</h1>
        <p className="lede">Estimate depth, aim a virtual camera in your browser, then run a Comfy workflow to generate a new view.</p>
      </header>

      <section className="studio" aria-label="Re-shoot studio">
        <aside className="controls">
          <label className="field"><span>01 · Source clip</span><input type="file" accept="video/mp4" onChange={(event) => chooseVideo(event.target.files?.[0])} /></label>
          <label className="field"><span>Aspect ratio</span><select value={aspect} onChange={(event) => { setAspect(event.target.value); setGeometry(null); setPhase("idle"); setMessage("Settings changed. Analyze depth again."); }}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option></select></label>
          <label className="field"><span>Output size</span><select value={megapixels} onChange={(event) => { setMegapixels(Number(event.target.value)); setGeometry(null); setPhase("idle"); setMessage("Settings changed. Analyze depth again."); }}><option value={0.4}>480p · 0.4 MP</option><option value={1}>768p · 1 MP</option></select></label>
          <button type="button" disabled={!video || phase === "analyzing" || phase === "generating"} onClick={() => void submit("analyze")}>{phase === "analyzing" ? "Analyzing…" : "Analyze depth"}</button>
          <fieldset disabled={!geometry || phase === "generating"}>
            <legend>02 · Aim camera</legend>
            <label className="field"><span>Azimuth · {azimuth}°</span><input type="range" min="-45" max="45" value={azimuth} onChange={(event) => setAzimuth(Number(event.target.value))} /></label>
            <label className="field"><span>Elevation · {elevation}°</span><input type="range" min="-30" max="30" value={elevation} onChange={(event) => setElevation(Number(event.target.value))} /></label>
            <label className="field"><span>Distance · {distance.toFixed(2)}×</span><input type="range" min="0.5" max="2" step="0.05" value={distance} onChange={(event) => setDistance(Number(event.target.value))} /></label>
          </fieldset>
          <label className="field"><span>What is beyond the frame? (optional)</span><textarea value={prompt} maxLength={500} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe what the new view should reveal." /></label>
          <button type="button" className="primary" disabled={!video || !geometry || phase === "generating"} onClick={() => void submit("generate")}>{phase === "generating" ? "Generating…" : "Generate new view"}</button>
          <p className={`status${error ? " error" : ""}`} role="status">{message}</p>
        </aside>
        <section className="preview" aria-label="Camera preview">
          {geometry ? <canvas ref={canvas} /> : objectUrl ? <video src={objectUrl} controls muted playsInline /> : <p>Choose a clip, then analyze its depth to see the camera preview.</p>}
          <p className="hint">Magenta pixels show areas the original camera did not see.</p>
        </section>
      </section>

      {results.length > 0 && <section className="results"><h2>Generated outputs</h2>{results.map((output) => <article key={output.id}><h3>{output.name}</h3>{output.name.includes("warp") ? <video controls src={output.url} /> : <video controls src={output.url} /> }<a href={output.url} download={output.name}>Download</a></article>)}</section>}
    </main>
  );
}

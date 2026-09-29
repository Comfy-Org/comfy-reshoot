import { NextResponse } from "next/server";
import { submitWorkflow } from "../../../lib/comfy";

export const runtime = "nodejs";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function settings(form: FormData): {
  step: "analyze" | "generate";
  settings: { aspect: string; megapixels: number; azimuth: number; elevation: number; distance: number; prompt: string };
} {
  const step = form.get("step");
  const aspect = form.get("aspect");
  const megapixels = Number(form.get("megapixels"));
  const azimuth = Number(form.get("azimuth") ?? 0);
  const elevation = Number(form.get("elevation") ?? 0);
  const distance = Number(form.get("distance") ?? 1);
  const prompt = form.get("prompt");
  if (step !== "analyze" && step !== "generate") throw new Error("Choose analyze or generate.");
  if (!["16:9", "9:16", "1:1", "4:3"].includes(String(aspect))) throw new Error("Choose a supported aspect ratio.");
  if (![0.4, 1].includes(megapixels)) throw new Error("Choose 480p or 768p.");
  if (![azimuth, elevation, distance].every(Number.isFinite)) throw new Error("Camera values must be numbers.");
  if (Math.abs(azimuth) > 90 || elevation < -45 || elevation > 45 || distance < 0.5 || distance > 2) {
    throw new Error("Keep the camera within the supported preview range.");
  }
  return {
    step,
    settings: {
      aspect: String(aspect), megapixels, azimuth, elevation, distance,
      prompt: typeof prompt === "string" ? prompt.slice(0, 500) : "",
    },
  };
}

export async function POST(request: Request) {
  let video: File;
  let step: "analyze" | "generate";
  let input: ReturnType<typeof settings>["settings"];
  try {
    const form = await request.formData();
    const upload = form.get("video");
    if (!(upload instanceof File) || upload.size === 0) throw new Error("Choose a video clip.");
    if (upload.type !== "video/mp4") throw new Error("For this guide, upload an MP4 video.");
    if (upload.size > MAX_VIDEO_BYTES) throw new Error("Keep clips under 100 MB for this local sample.");
    video = upload;
    ({ step, settings: input } = settings(form));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Choose an MP4 video." },
      { status: 400 },
    );
  }

  try {
    const job = await submitWorkflow(video, step, input);

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const missingApiKey = error instanceof Error && error.message.includes("COMFY_API_KEY");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit job." },
      { status: missingApiKey ? 503 : 502 },
    );
  }
}

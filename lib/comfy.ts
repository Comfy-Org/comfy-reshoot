import { join } from "node:path";
import { Comfy, type Job } from "@comfyorg/sdk";

export type JobOutput = { id: string; name: string; type: string; url: string };
export type PublicJob = { id: string; status: string; outputs: JobOutput[]; error: unknown };

function client() {
  const apiKey = process.env.COMFY_API_KEY?.trim();
  if (!apiKey) throw new Error("COMFY_API_KEY is not configured.");
  return new Comfy({ apiKey, clientInfo: "comfy-reshoot-guide" });
}

async function publicJob(job: Job): Promise<PublicJob> {
  return {
    id: job.id,
    status: job.status,
    outputs: job.outputs.map((output) => ({
      id: output.id,
      name: output.name,
      type: output.type,
      url: `/api/jobs/${job.id}/outputs/${output.id}`,
    })),
    error: job.error,
  };
}

export async function submitWorkflow(
  video: File,
  step: "analyze" | "generate",
  settings: { aspect: string; megapixels: number; azimuth: number; elevation: number; distance: number; prompt: string },
) {
  const comfy = client();
  const workflow = await comfy.workflows.fromFile(join(process.cwd(), "workflows", `${step}.api.json`));
  const asset = comfy.assets.fromBytes(new Uint8Array(await video.arrayBuffer()), {
    filename: video.name,
    contentType: video.type || "video/mp4",
  });
  workflow.setInput("1", "file", asset);
  workflow.setInput("2", "duration", 15);
  workflow.setInput("2", "aspect_ratio", settings.aspect);
  workflow.setInput("2", "megapixels", settings.megapixels);

  if (step === "generate") {
    workflow.setInput("5", "azimuth", settings.azimuth);
    workflow.setInput("5", "elevation", settings.elevation);
    workflow.setInput("5", "distance", settings.distance);
    workflow.setInput("20", "prompt", settings.prompt.trim() ? `crossview. ${settings.prompt.trim()}` : "crossview.");
  }

  return publicJob(await comfy.submit(workflow));
}

export async function getJob(id: string) {
  return publicJob(await client().jobs.get(id));
}

export async function getOutput(jobId: string, outputId: string) {
  const job = await client().jobs.get(jobId);
  const output = job.outputs.find((candidate) => candidate.id === outputId);
  if (!output) throw new Error("Output not found on this job.");
  const { url } = await output.getDownloadUrl();
  return fetch(url);
}

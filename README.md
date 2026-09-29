# Re-shoot a video — Comfy workflow guide

Upload an MP4, run depth estimation, adjust the camera preview, then submit a workflow to generate a new view.

You need a Comfy Developer Platform account, an API key, and a deployment with the nodes and models listed in [`build/model-files.md`](build/model-files.md). The workflow was demonstrated on a 96 GB GPU and uses your deployment's credits.

## Run the app

1. Install [Node.js 22.6 or newer](https://nodejs.org/). Prepare a Comfy Developer Platform deployment with the custom CrossView nodes, MiniMax H3, MoGe, and CrossView LoRA by following [`build/model-files.md`](build/model-files.md). Cloning this repo does not create that deployment.
2. Copy this repository and make local settings:

   ```sh
   git clone https://github.com/Comfy-Org/comfy-reshoot.git
   cd comfy-reshoot
   cp .env.example .env.local
   ```

3. Add the API key for the workspace that owns your deployment to `COMFY_API_KEY`. Set `COMFY_BASE_URL` to the deployment URL from the Developer Platform; the SDK reads both variables from `.env.local` on the server.
4. Install and start the app:

   ```sh
   npm ci
   npm run dev
   ```

5. Open <http://localhost:3000>, choose [`samples/sunlit-room-test.mp4`](samples/sunlit-room-test.mp4), and select **Analyze depth**. When analysis finishes, adjust the camera with the sliders and select **Generate new view**. The results include the generated video, an original-audio version, and a warp guide. The included five-second clip lets you try the flow without preparing another video.

The first job may take several minutes while the deployment starts and loads its models. The server reads the key from `.env.local`; do not expose it in a `NEXT_PUBLIC_` variable or commit the file.

## How the Comfy flow works

```text
clip → Comfy asset → analyze.api.json → .cvgeo depth file
      → browser WebGL camera preview
clip + camera settings → generate.api.json → result videos
```

- [`components/app-runner.tsx`](components/app-runner.tsx) submits jobs, checks their status, reads the depth file, and redraws the preview when you move the camera.
- [`app/api/jobs/route.ts`](app/api/jobs/route.ts) checks the clip and settings. [`lib/comfy.ts`](lib/comfy.ts) loads a workflow, binds the uploaded video to `LoadVideo.file`, submits it with the Comfy SDK and returns a job ID.
- [`workflows/analyze.api.json`](workflows/analyze.api.json) prepares the clip and returns one `.cvgeo` file. [`workflows/generate.api.json`](workflows/generate.api.json) runs depth, CrossView Warp and MiniMax H3, then saves three videos.
- `lib/comfy.ts` sends the clip to node `1`, duration/aspect/size to node `2`, camera values to node `5`, and the prompt to node `20`. Update these IDs and input names if you change the corresponding nodes in the API graph.
- [`src/lib/crossview/cvgeo.ts`](src/lib/crossview/cvgeo.ts) reads the geometry export. `camera.ts` and `warp-renderer.ts` redraw that geometry in WebGL2 so aiming does not submit a new GPU job.
- The result route fetches output bytes on the server and streams them to the browser. The browser never needs the Comfy API key.

## Change the app

To change the default camera angle, edit the initial slider values in `components/app-runner.tsx`. To change the prompt sent to H3, edit the prompt field or its default there. `lib/comfy.ts` sends camera values to node `5` and the prompt to node `20`.

To edit a workflow, open it in ComfyUI and export **Workflow (API)**. Replace the corresponding file in `workflows/`. If the change adds a model or custom node, add it to the Comfy build and publish a new release before running the app.

## Build the Comfy environment

`workflows/*.api.json` are API-format graphs for job submission. The Deployment Build must contain every node class and model file named by those graphs. The list and upstream download locations are in [`build/model-files.md`](build/model-files.md).

Install the Comfy CLI and sign in to the same Comfy account that owns the deployment. These commands assume you already have a local ComfyUI folder prepared with the node and model files listed above. Run the commands from that ComfyUI root (the folder containing `models/` and `custom_nodes/`), not from this web-app repo:

```sh
pip install comfy-cli
comfy setup --where cloud
cd /path/to/ComfyUI
comfy build init --name comfy-reshoot --models-dir ./models --custom-nodes-dir ./custom_nodes
comfy build status
comfy build push --release --target linux/nvidia
comfy deploy refs compute
```

Use a GPU and region shown by the last command, then create a deployment from the released Build on the Developer Platform. Copy the deployment URL into `.env.local`. Keep the generated `comfy-build.yaml` with your own deployment configuration. Worker/GPU availability changes, so pick from the current compute list. Pause or delete deployments when you are finished to stop compute charges.

The command sequence packages an already-prepared environment; it does not download gated model files or install GPU-specific Python dependencies. Before using a deployment, run **Analyze depth** and confirm it returns `.cvgeo`, then run **Generate new view** and confirm the videos appear.

The workflow uses the H3 CrossView LoRA under its model-specific license. Read the licenses linked in [`build/model-files.md`](build/model-files.md) before downloading or redistributing model files. Model weights are not stored in Git.

## Limits

- The sample accepts MP4 files up to 100 MB and uses clips between 5 and 15 seconds.
- Changing the clip, aspect or output size requires running depth analysis again.
- The warp preview is an approximation of the generated view; large camera moves reveal areas no source frame captured.
- The UI keeps the active job in memory. Reloading the page clears it.
- The included test clip is synthetic. You can also analyze an MP4 you have permission to process.

## License and source

The camera, geometry reader and WebGL renderer are adapted from ComfyUI_frontend, so this repo is GPL-3.0. The standalone starter code came from Comfy-Org's MIT-licensed [`img2img-web-app`](https://github.com/Comfy-Org/comfy-examples/tree/main/img2img-web-app); its notice is in `THIRD_PARTY_NOTICES/comfy-examples-MIT.txt`. The CrossView node pack's Apache-2.0 license is included in `THIRD_PARTY_NOTICES/CrossViewWarp-LICENSE.txt`. Model licenses are separate.

# Re-shoot a video — Comfy workflow guide

Upload a short clip, ask Comfy to estimate depth, move a virtual camera in the browser, then submit a workflow that generates the new view.

This repo is a small local, single-user teaching app. It needs a Comfy Developer Platform account, a deployment containing the workflows' nodes and models, and your own API key. The H3 model build is large and needs a high-memory GPU; the source app was demonstrated on a 96 GB GPU. This app uses your deployment and credits.

## Run the app

1. Create a Comfy API deployment by following [Build and deploy ComfyUI](https://docs.comfy.org/development/serverless/overview). Start with the model and node list in [`build/model-files.md`](build/model-files.md). The deployment must load the custom CrossView nodes, MiniMax H3, MoGe and the CrossView LoRA.
2. Copy this repository and make local settings:

   ```sh
   git clone https://github.com/Comfy-Org/comfy-reshoot.git
   cd comfy-reshoot
   cp .env.example .env.local
   ```

3. Add the API key for the workspace that owns your deployment to `COMFY_API_KEY`. Set `COMFY_BASE_URL` to the deployment URL from the Developer Platform.
4. Install and start the app:

   ```sh
   npm ci
   npm run dev
   ```

5. Open <http://localhost:3000>, choose [`samples/sunlit-room-test.mp4`](samples/sunlit-room-test.mp4), and select **Analyze depth**. When analysis finishes, move the camera with the sliders, then choose **Generate new view**. The results include the generated video, original-audio version and warp guide. The included 5-second synthetic clip has simple foreground, middle-ground and background shapes, so you can try the flow without finding or uploading a personal video.

The first job may take several minutes while the deployment starts and loads its models. The key stays in `.env.local` and is read by the local server. Do not put it in a `NEXT_PUBLIC_` variable or commit the file.

## How the Comfy flow works

```text
clip → Comfy asset → analyze.api.json → .cvgeo depth file
      → browser WebGL camera preview
clip + camera settings → generate.api.json → result videos
```

- [`components/app-runner.tsx`](components/app-runner.tsx) handles the two buttons, polls jobs, decodes the returned depth file and redraws the preview as the camera changes.
- [`app/api/jobs/route.ts`](app/api/jobs/route.ts) checks the clip and settings. [`lib/comfy.ts`](lib/comfy.ts) loads a workflow, binds the uploaded video to `LoadVideo.file`, submits it with the Comfy SDK and returns a job ID.
- [`workflows/analyze.api.json`](workflows/analyze.api.json) prepares the clip and returns one `.cvgeo` file. [`workflows/generate.api.json`](workflows/generate.api.json) runs depth, CrossView Warp and MiniMax H3, then saves three videos.
- `node 2` holds the clip duration, aspect and pixel budget. `node 5` holds the camera angle. `node 20` holds the `crossview.` prompt. These IDs are visible in the exported API graph, so you can edit the graph without hunting through app code.
- [`src/lib/crossview/cvgeo.ts`](src/lib/crossview/cvgeo.ts) reads the geometry export. `camera.ts` and `warp-renderer.ts` redraw that geometry in WebGL2 so aiming does not submit a new GPU job.
- The result route fetches output bytes on the server and streams them to the browser. The browser never needs the Comfy API key.

## Change the app

Try changing the default camera angle or prompt in the form. Then change the matching default in the UI. The request code sends the same value to node `5` or `20` in the workflow. If you change a node ID or its input name in the graph, update the corresponding `setInput` call in `lib/comfy.ts`.

Try changing a workflow node in ComfyUI and exporting **Workflow (API)**. Save the new API graph in `workflows/`, then point `lib/comfy.ts` to it. A changed workflow may add a model or custom node; update your local Comfy install and publish a new Developer Platform Build release before running it.

## Build the Comfy environment

`workflows/*.api.json` are API-format graphs for job submission. The Deployment Build must contain every node class and model file named by those graphs. The list and upstream download locations are in [`build/model-files.md`](build/model-files.md).

From a ComfyUI install that has those custom nodes and models, create a Build definition and release:

```sh
comfy build init --name comfy-reshoot --models-dir ./models --custom-nodes-dir ./custom_nodes
comfy build status
comfy build push --release --target linux/nvidia
comfy deploy refs compute
```

Use a GPU and region shown by the last command, then create a deployment from the released Build using the Deploy page or `comfy deploy up`. Copy its deployment URL into `.env.local`. Keep the generated `comfy-build.yaml` with your own deployment configuration. Worker/GPU availability changes, so pick from the current compute list. Pause or delete deployments when you are finished to stop compute charges.

The workflow uses the H3 CrossView LoRA under its model-specific license. Read the licenses linked in [`build/model-files.md`](build/model-files.md) before downloading or redistributing model files. Model weights are not stored in Git.

## Limits

- The sample accepts MP4 files up to 100 MB and uses clips between 5 and 15 seconds.
- Changing the clip, aspect or output size requires running depth analysis again.
- The warp preview is an approximation of the generated view; large camera moves reveal areas no source frame captured.
- The UI keeps the active job ID in memory. Reloading the page loses its history; copy the ID from the status response if you need to inspect a job after a reload.
- The included sample is synthetic. For a more realistic depth estimate, try your own MP4 that you have permission to process.

## License and source

The camera, geometry reader and WebGL renderer are adapted from ComfyUI_frontend, so this repo is GPL-3.0. The standalone starter code came from Comfy-Org's MIT-licensed [`img2img-web-app`](https://github.com/Comfy-Org/comfy-examples/tree/main/img2img-web-app); its notice is in `THIRD_PARTY_NOTICES/comfy-examples-MIT.txt`. The CrossView node pack's Apache-2.0 license is included in `THIRD_PARTY_NOTICES/CrossViewWarp-LICENSE.txt`. Model licenses are separate.

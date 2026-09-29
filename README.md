# Comfy Reshoot

A standalone app for reshooting videos with Comfy workflows. Upload an MP4, run depth estimation, adjust the camera preview, then generate a new view.

You need a Comfy Developer Platform account, an API key, and a deployment with the nodes and models listed in [`build/model-files.md`](build/model-files.md). The workflow was demonstrated on a 96 GB GPU; smaller configurations have not been tested. Generation uses deployment credits.

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

## Comfy workflow

**Analyze depth** submits `workflows/analyze.api.json` and returns a `.cvgeo` depth file for the browser preview. **Generate new view** submits `workflows/generate.api.json`, which runs MoGe, CrossView Warp, and MiniMax H3 and saves three videos. `lib/comfy.ts` maps the uploaded clip to node `1`, output settings to node `2`, camera values to node `5`, and the prompt to node `20`. The server downloads the outputs and returns them to the browser.

## Change the app

The camera defaults and prompt field are in `components/app-runner.tsx`. `lib/comfy.ts` sends those values to nodes `5` and `20`.

To edit a workflow, open it in ComfyUI and export **Workflow (API)**. Replace the corresponding file in `workflows/`. If the change adds a model or custom node, add it to the Comfy build and publish a new release before running the app.

## Build the Comfy environment

The deployment Build must include every node and model used by the API workflows. The versions, files, and download commands are in [`build/model-files.md`](build/model-files.md).

Install the Comfy CLI and sign in to the Comfy account for your deployment. Run these commands from the prepared ComfyUI folder containing `models/` and `custom_nodes/`:

```sh
pip install comfy-cli
comfy setup --where cloud
cd /path/to/ComfyUI
comfy build init --name comfy-reshoot --models-dir ./models --custom-nodes-dir ./custom_nodes
comfy build status
comfy build push --release --target linux/nvidia
comfy deploy refs compute
```

Create a deployment from the released Build, choose an available GPU and region, and put its URL in `.env.local`. Stop or delete the deployment when you finish to end GPU charges.

These commands package the local ComfyUI install; they do not download model files. After deployment, run **Analyze depth** and confirm it returns `.cvgeo`, then run **Generate new view** and confirm three videos appear.

## Limits

- The sample accepts MP4 files up to 100 MB and uses clips between 5 and 15 seconds.
- Changing the clip, aspect or output size requires running depth analysis again.
- The warp preview is an approximation of the generated view; large camera moves reveal areas no source frame captured.
- Reloading the page clears the current job and results from the UI.

## License

MIT. See [`LICENSE`](LICENSE). Third-party license notices are in [`THIRD_PARTY_NOTICES`](THIRD_PARTY_NOTICES). Model licenses are separate.

# Re-shoot Build inputs

The generation graph references these model files and nodes. Comfy workflows need the identifiers below to match what the deployment loads.

The built-in H3 and MoGe node implementations used by this guide came from ComfyUI `2255709aa0` (v0.37.0). In your local ComfyUI checkout, use that revision before preparing the Build:

```sh
git -C /path/to/ComfyUI checkout 2255709aa0
```

## Custom nodes

Install the demo-node branch, which includes `CrossViewPrepareClip` and `CrossViewGeometryExport` as well as the CrossView Warp node. Pin it to the revision used while preparing this guide so later branch changes do not silently change the Build:

```sh
cd /path/to/ComfyUI/custom_nodes
git clone https://github.com/comfyrob/ComfyUI-CrossViewWarp.git
cd ComfyUI-CrossViewWarp
git checkout fbb1e93c7193329ff3ce7c17f95166b539687876
```

If you already cloned the repo, run `git fetch origin` then `git checkout fbb1e93c7193329ff3ce7c17f95166b539687876` inside it. The commands below that create the Build must then be run from the ComfyUI root (`cd ../..` from this custom-node folder).

## Model files

| File in workflow | Place under `models/` | Source repository |
| --- | --- |
| `minimax_h3_ref2va_pruned_int8_convrot.safetensors` | `diffusion_models/` | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3) |
| `qwen3vl_32b_minimax_h3_int8_convrot.safetensors` | `text_encoders/` | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3) |
| `minimax_h3_video_vae_int8_convrot.safetensors` | `vae/` | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3) |
| `minimax_h3_audio_vae_fp32.safetensors` | `vae/` | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3) |
| `moge_2_vitl_normal_fp16.safetensors` | `geometry_estimation/` | [Comfy-Org/MoGe](https://huggingface.co/Comfy-Org/MoGe) |
| `MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors` | `loras/` | [Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1](https://huggingface.co/Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1) |
| `minimax_h3_ref2v_turbo_8step_v1.0_768p_comfyui_bf16.safetensors` | `loras/` | [lightx2v/Minimax-h3-Turbo](https://huggingface.co/lightx2v/Minimax-h3-Turbo) |

The matching H3/MoGe nodes were part of the ComfyUI version used by the prototype (`2255709aa0`, v0.37.0). Model repositories may gate downloads or change their file names; check the repository file list if a link changes. Follow each model card's access and license terms. Do not commit the weights. The source prototype environment also included the model-specific workflow dependencies; if a node reports a missing Python package during build or startup, install the dependencies from that node's `requirements.txt` in the ComfyUI environment before publishing.

Download the files from the ComfyUI root (the folder that contains `models/`). You need Python and the Hugging Face CLI; sign in if a repository asks you to accept its model terms or grant access:

```sh
cd /path/to/ComfyUI
python -m pip install -U huggingface_hub
hf auth login
hf download Comfy-Org/MiniMax-H3 minimax_h3_ref2va_pruned_int8_convrot.safetensors --local-dir models/diffusion_models
hf download Comfy-Org/MiniMax-H3 qwen3vl_32b_minimax_h3_int8_convrot.safetensors --local-dir models/text_encoders
hf download Comfy-Org/MiniMax-H3 minimax_h3_video_vae_int8_convrot.safetensors --local-dir models/vae
hf download Comfy-Org/MiniMax-H3 minimax_h3_audio_vae_fp32.safetensors --local-dir models/vae
hf download Comfy-Org/MoGe moge_2_vitl_normal_fp16.safetensors --local-dir models/geometry_estimation
hf download Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1 MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors --local-dir models/loras
hf download lightx2v/Minimax-h3-Turbo minimax_h3_ref2v_turbo_8step_v1.0_768p_comfyui_bf16.safetensors --local-dir models/loras
```

If `hf auth login` is unnecessary for the repositories available to you, skip it. Once the files are downloaded into the directories expected by their nodes, run `comfy build init` from this same ComfyUI root to capture them in your own `comfy-build.yaml`. The generation environment needs substantial GPU memory; the original was demonstrated on a 96 GB GPU. This is a known working configuration, not a claim about the minimum.

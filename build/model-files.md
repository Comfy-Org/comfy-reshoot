# Re-shoot Build inputs

The generation graph references these model files and nodes. Comfy workflows need the identifiers below to match what the deployment loads.

## Custom nodes

Install the demo-node branch, which includes `CrossViewPrepareClip` and `CrossViewGeometryExport` as well as the CrossView Warp node:

```sh
cd ComfyUI/custom_nodes
git clone --branch comfyrob/demo-nodes https://github.com/comfyrob/ComfyUI-CrossViewWarp.git
```

Pin a known commit in your Build instead of tracking the branch for a repeatable release. This branch is the source used by the app prototype.

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

The matching H3/MoGe nodes were part of the ComfyUI version used by the prototype (`2255709aa0`, v0.37.0). Model repositories may gate downloads or change their file names; check the repository file list if a link changes. Follow each model card's access and license terms. Do not commit the weights.

After downloading the models into the directories expected by their nodes, run `comfy build init` to capture them in your own `comfy-build.yaml`. The generation environment needs substantial GPU memory; the original was demonstrated on a 96 GB GPU. This is a known working configuration, not a claim about the minimum.

# Pipeline Flowchart - Visual Representation

## Simplified Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT: Video Path + Flags                    │
│  (unet_flag, face_restore_flag, upscale_flag, upscale_value,   │
│   clahe_flag)                                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              TASK 1: Restore B&W Film                           │
│  restore_bw_film_cached()                                       │
│  Output: restored_video_path                                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ face_restore_flag│
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │ YES                         │ NO
              ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│  TASK 2: Face Enhancement │   │   Skip Face Enhancement   │
│  upscale_faces_cached()   │   │   (Use restored video)    │
│  Output:                  │   │                           │
│  faces_upscaled_video_    │   │                           │
│  path                     │   └───────────┬───────────────┘
└──────────────┬────────────┘               │
               │                            │
               └────────────┬───────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  upscale_flag    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │ YES                         │ NO
              ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│ TASK 3: Background Upscale│   │  Skip Background Upscale  │
│ background_upscale_       │   │  (Use previous output)    │
│ video_onnx_cached()       │   │                           │
│ Model: Real-ESRGAN        │   │                           │
│ Output: background_       │   └───────────┬───────────────┘
│ upscaled_video_path       │               │
└──────────────┬────────────┘               │
               │                            │
               └────────────┬───────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              TASK 4: Scene Split                                │
│  run_scene_split_cached()                                       │
│  Output: scene_split_preview_video_path                         │
│  Also: scene_split_prevscene_video_path                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│        Start ComfyUI Server (Port 8188)                        │
│        wait_for_comfyui()                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      TASK 5a: Flux Colorization (Scene Batch)                  │
│  comfyflux_colorize_video_concat_scene_batch_cached()          │
│  Input: scene_split_prevscene_video_path                        │
│  Output: flux_path                                              │
│  Stop ComfyUI                                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│        Start ComfyUI Server Again                              │
│        wait_for_comfyui()                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      TASK 5b: Flux Colorization (Background)                   │
│  comfyflux_colorize_video_cached()                              │
│  Input: scene_split_prevscene_video_path                        │
│  Output: flux_prev_path                                         │
│  Stop ComfyUI                                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      TASK 5c: Merge Background Colorization                    │
│  colorize_scenes_prev_cached()                                  │
│  Input: flux_prev_path                                          │
│  Output: colorized_final_video_prev_path                        │
│  Updates: flux_path = colorized_final_video_prev_path          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      TASK 5d: Masked Region Replacement                        │
│  replace_masked_regions_between_videos()                        │
│  Input: org_flux_path (from 5a) + flux_path (from 5c)          │
│  Output: flux_path (merged)                                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      TASK 6: Final Scene-wise Colorization Merge               │
│  colorize_scenes_cached()                                       │
│  Input: flux_path                                               │
│  Output: colorized_final_video_path                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│      TASK 7: Postprocess Videos                                │
│  postprocess_videos_cached()                                    │
│  Input: colorized_final_video_path                              │
│  Output: post_processed_video_path                              │
└──────────────┬───────────────────────────────┬──────────────────┘
               │                               │
               ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│  TASK 8a: Remix Audio     │   │  TASK 8b: Remix Audio     │
│  (With Post-processing)   │   │  (Without Post-processing)│
│  remix_audio_cached()     │   │  remix_audio_cached()     │
│  Input: post_processed_   │   │  Input: colorized_final_  │
│  video_path               │   │  video_path               │
│  Output: final_post       │   │  Output: final_video_path │
│  processed_video_path     │   │                           │
└───────────────────────────┘   └───────────────────────────┘
```

## Key Decision Points

### 1. Face Restoration Branch
- **Condition**: `face_restore_flag`
- **If True**: Enhances faces using `upscale_faces_cached()`
- **If False**: Skips to next step using restored video

### 2. Background Upscaling Branch
- **Condition**: `upscale_flag`
- **If True**: Upscales background using Real-ESRGAN
- **If False**: Uses video from previous step
- **Parameters**: `upscale_value` (1.0-4.0), `clahe_flag`

### 3. Dual Colorization Path
- **Path A**: Scene batch colorization (Task 5a)
- **Path B**: Background colorization (Task 5b)
- **Merge**: Combined in Task 5c and Task 5d

### 4. Final Output Branch
- **Path A**: With post-processing (Task 8a)
- **Path B**: Without post-processing (Task 8b)

## Processing Stages Summary

| Stage | Task | Always Executes | Conditional On |
|-------|------|----------------|----------------|
| Preprocessing | 1. Restore B&W | ✅ Yes | - |
| Enhancement | 2. Face Enhancement | ❌ No | `face_restore_flag` |
| Enhancement | 3. Background Upscale | ❌ No | `upscale_flag` |
| Analysis | 4. Scene Split | ✅ Yes | - |
| Colorization | 5a. Flux (Scene Batch) | ✅ Yes | - |
| Colorization | 5b. Flux (Background) | ✅ Yes | - |
| Colorization | 5c. Merge Background | ✅ Yes | - |
| Colorization | 5d. Mask Replacement | ✅ Yes | - |
| Merge | 6. Final Scene Merge | ✅ Yes | - |
| Post-process | 7. Postprocess | ✅ Yes | - |
| Audio | 8a. Remix (with post) | ✅ Yes | - |
| Audio | 8b. Remix (without post) | ✅ Yes | - |

## Memory Management

```
Each Task:
  ↓
clear_gpu()  ← Frees GPU memory
  ↓
Process Video
  ↓
Next Task
```

## ComfyUI Server Lifecycle

```
Task 5a:
  Start ComfyUI → Process → Stop ComfyUI
  
Task 5b:
  Start ComfyUI → Process → Stop ComfyUI
```

**Note**: ComfyUI is started and stopped twice during the pipeline execution.


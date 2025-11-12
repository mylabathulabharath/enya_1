# Video Restoration & Colorization Pipeline Flow Analysis

## Overview
This pipeline processes black and white videos through multiple stages: restoration, enhancement, upscaling, scene splitting, colorization, and post-processing.

## Command Line Arguments
```
Usage: pipeline.py <input_video_path> <unet_flag> <face_restore_flag> <upscale_flag> <upscale_value> <clahe_flag>
```

**Parameters:**
- `input_video_path`: Path to input video
- `unet_flag`: Boolean flag for UNet colorization (currently commented out)
- `face_restore_flag`: Boolean flag to enable face enhancement
- `upscale_flag`: Boolean flag to enable background upscaling
- `upscale_value`: Float value between 1.0 and 4.0 for upscaling factor
- `clahe_flag`: Boolean flag for CLAHE (Contrast Limited Adaptive Histogram Equalization)

---

## Pipeline Flow

### **Phase 1: Preprocessing & Enhancement**

#### **Task 1: Restore B&W Film** ✅
- **Function**: `restore_bw_film_cached()`
- **Input**: Original input video
- **Output**: `restored_video_path`
- **Purpose**: Initial restoration of black and white film
- **Always executes**: Yes

#### **Task 2: Face Enhancement** (Conditional)
- **Function**: `upscale_faces_cached()`
- **Input**: `restored_video_path` or original video (fallback)
- **Output**: `faces_upscaled_video_path`
- **Purpose**: Enhance facial features in the video
- **Condition**: Only if `face_restore_flag == True`

#### **Task 3: Background Upscaling** (Conditional)
- **Function**: `background_upscale_video_onnx_cached()`
- **Input**: `faces_upscaled_video_path` or previous step output
- **Output**: `background_upscaled_video_path`
- **Model**: Real-ESRGAN-General-x4v3.onnx
- **Purpose**: Upscale background while preserving quality
- **Condition**: Only if `upscale_flag == True`
- **Parameters**: 
  - `clahe_flag`: Apply CLAHE enhancement
  - `scale`: Upscale factor (1-4x)

---

### **Phase 2: Scene Analysis**

#### **Task 4: Scene Split**
- **Function**: `run_scene_split_cached()`
- **Input**: `background_upscaled_video_path` or previous step output
- **Output**: `scene_split_preview_video_path`
- **Purpose**: Split video into scenes for individual processing
- **Additional Output**: Creates `scene_split_prevscene_video_path` (previous scene variant)

---

### **Phase 3: Colorization**

#### **Task 5a: Primary Colorization (Flux - Scene Batch)**
- **ComfyUI Server**: Started before this step
- **Function**: `comfyflux_colorize_video_concat_scene_batch_cached()`
- **Input**: `scene_split_prevscene_video_path`
- **Output**: `flux_path`
- **Purpose**: Colorize scenes using Flux model with batch processing
- **Parameters**:
  - `prompt`: "restore and colorize this, no warm/cool tint in entire image, color background, natural and pale skintones, ornaments on people with gold color"
  - `seed`: 2^24
  - `steps`: 20
  - `cfg`: 1.0
  - `flux_guidance`: 2.5
  - `images_per_row`: 2
  - `total_images_per_combined`: 6
- **ComfyUI**: Stopped after this step

#### **Task 5b: Background Colorization (Flux - Single)**
- **ComfyUI Server**: Restarted for this step
- **Function**: `comfyflux_colorize_video_cached()`
- **Input**: `scene_split_prevscene_video_path`
- **Output**: `flux_prev_path`
- **Purpose**: Colorize background scenes separately
- **Parameters**:
  - `prompt`: "Restore and colorize this, No warm/cool tint in entire image, color background, natural skintones"
  - `seed`: 2^24
  - `steps`: 20
  - `cfg`: 1.0
  - `flux_guidance`: 5.0
- **ComfyUI**: Stopped after this step

#### **Task 5c: Merge Background Colorization**
- **Function**: `colorize_scenes_prev_cached()`
- **Input**: `flux_prev_path`, `scene_split_prevscene_video_path`, `scene_split_input_path`
- **Output**: `colorized_final_video_prev_path`
- **Purpose**: Merge background colorization with scenes
- **Note**: Updates `flux_path` with previous scene colorization

#### **Task 5d: Masked Region Replacement**
- **Function**: `replace_masked_regions_between_videos()`
- **Input**: Original `flux_path` (from Task 5a) and updated `flux_path` (from Task 5c)
- **Output**: `flux_path` (merged with masked regions)
- **Purpose**: Replace specific masked regions between two colorized versions
- **Output Suffix**: `_maskedmerge.mp4`

---

### **Phase 4: Final Processing**

#### **Task 6: Final Scene-wise Colorization Merge**
- **Function**: `colorize_scenes_cached()`
- **Input**: `annotated_path` or `flux_path` or `unet_video_path`
- **Additional Inputs**: `scene_split_preview_video_path`, `scene_split_input_path`
- **Output**: `colorized_final_video_path`
- **Purpose**: Final merge of all colorized scenes into complete video

#### **Task 7: Postprocess Videos**
- **Function**: `postprocess_videos_cached()`
- **Input**: `colorized_final_video_path`
- **Output**: `post_processed_video_path`
- **Purpose**: Apply post-processing enhancements

---

### **Phase 5: Audio & Final Output**

#### **Task 8a: Remix Audio (Post-processed)**
- **Function**: `remix_audio_cached()`
- **Input**: `post_processed_video_path`
- **Output**: `final_postprocessed_video_path`
- **Suffix**: "final_post_process"
- **Purpose**: Remix audio with post-processed video

#### **Task 8b: Remix Audio (Without post-processing)**
- **Function**: `remix_audio_cached()`
- **Input**: `colorized_final_video_path`
- **Output**: `final_video_path`
- **Suffix**: "final_without_post_process"
- **Purpose**: Remix audio with colorized video (bypassing post-processing)

---

## Key Features

### **GPU Memory Management**
- `clear_gpu()` function called before each major task
- Ensures GPU memory is freed between processing steps
- Uses `torch.cuda.synchronize()`, `torch.cuda.empty_cache()`, and `gc.collect()`

### **ComfyUI Server Management**
- `start_comfyui()`: Starts ComfyUI server on port 8188
- `wait_for_comfyui()`: Waits for server to be ready (up to 600 seconds)
- `stop_comfyui()`: Gracefully stops ComfyUI server
- Server is started/stopped for Flux colorization steps

### **Caching Strategy**
- All major functions use `_cached` suffix
- Likely implements caching to avoid reprocessing unchanged inputs

### **Conditional Execution**
- Face enhancement: Only if `face_restore_flag == True`
- Background upscaling: Only if `upscale_flag == True`
- Fallback logic: Each step uses previous output or falls back to earlier stages

---

## Data Flow Diagram

```
Input Video
    ↓
[Task 1] Restore B&W Film
    ↓
[Task 2] Face Enhancement (conditional)
    ↓
[Task 3] Background Upscaling (conditional)
    ↓
[Task 4] Scene Split
    ├──→ scene_split_preview_video_path
    └──→ scene_split_prevscene_video_path
    ↓
[Task 5a] Flux Colorization (Scene Batch) → flux_path
    ↓
[Task 5b] Flux Colorization (Background) → flux_prev_path
    ↓
[Task 5c] Merge Background → colorized_final_video_prev_path
    ↓
[Task 5d] Masked Region Replacement → flux_path (updated)
    ↓
[Task 6] Final Scene Merge → colorized_final_video_path
    ↓
[Task 7] Postprocess → post_processed_video_path
    ↓
[Task 8a] Remix Audio (post-processed) → final_postprocessed_video_path
    ↓
[Task 8b] Remix Audio (no post-process) → final_video_path
```

---

## Notes

1. **Commented Code**: Several alternative paths are commented out:
   - UNet colorization option
   - Deoldify colorization option
   - YOLO-based masking options
   - Alternative Flux prompts and parameters

2. **Dual Output**: Pipeline produces two final outputs:
   - `final_postprocessed_video_path`: With post-processing
   - `final_video_path`: Without post-processing

3. **Error Handling**: Limited error handling visible in the code; relies on function implementations

4. **Path Management**: Uses Path objects and string concatenation for output path management

5. **Prompt Engineering**: Multiple prompt variations tested; current active prompt focuses on:
   - No warm/cool tint
   - Natural skin tones
   - Color backgrounds
   - Consistent colors per person/dress

---

## Dependencies

- `torch`: PyTorch for GPU operations
- `requests`: For ComfyUI server communication
- `subprocess`: For ComfyUI server management
- `Utils.main_utils`: Custom utility module with all processing functions
- ComfyUI: External service for Flux-based colorization
- Real-ESRGAN: For background upscaling

---

## Potential Improvements

1. **Error Handling**: Add try-except blocks around major operations
2. **Logging**: Implement structured logging instead of print statements
3. **Configuration**: Move hardcoded values (prompts, seeds, parameters) to config file
4. **Validation**: Add input validation for video files
5. **Parallelization**: Some steps could run in parallel
6. **Cleanup**: Remove duplicate `stop_comfyui()` function definition
7. **Code Organization**: Separate ComfyUI management into a module


#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Wrapper script for pipeline.py that handles YouTube URLs and manual paths.
This script should be placed on each remote node in the same directory as pipeline.py.
"""

import sys
import os
import subprocess

# Add workspace to path
sys.path.insert(0, "/workspace")

from Utils.main_utils import get_input_video_path

def main():
    if len(sys.argv) < 2:
        print("Usage: pipeline_wrapper.py <youtube_url|manual_path> [unet_flag] [face_restore_flag] [upscale_flag] [upscale_value] [clahe_flag]")
        sys.exit(1)
    
    input_arg = sys.argv[1]
    
    # Determine if it's a YouTube URL or manual path
    is_youtube = 'youtube.com' in input_arg or 'youtu.be' in input_arg
    
    try:
        if is_youtube:
            # Download video from YouTube
            print(f"Downloading video from YouTube: {input_arg}")
            video_path = get_input_video_path(youtube_url=input_arg, manual_path=None)
        else:
            # Use manual path
            video_path = get_input_video_path(youtube_url=None, manual_path=input_arg)
        
        if not video_path or not os.path.exists(video_path):
            raise ValueError(f"Video path not found: {video_path}")
        
        print(f"Using video path: {video_path}")
        
        # Build pipeline command
        pipeline_args = [sys.executable, 'pipeline.py', video_path] + sys.argv[2:]
        
        # Change to workspace directory
        os.chdir('/workspace')
        
        # Execute pipeline.py and stream output
        process = subprocess.Popen(
            pipeline_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Stream output in real-time
        for line in process.stdout:
            print(line, end='', flush=True)
        
        # Wait for process to complete
        process.wait()
        
        # Exit with pipeline's exit code
        sys.exit(process.returncode)
        
    except Exception as e:
        print(f"Error in wrapper: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Remote API Server for Video Pipeline
This server runs inside Docker containers and handles job execution.
Install: pip install flask flask-cors
Run: python remote_api_server.py --hoSt 0.0.0.0 --port 9090
"""

import os
import sys
import subprocess
import threading
import json
import time
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import argparse

app = Flask(__name__)
CORS(app)

# Configuration
WORKSPACE_DIR = '/workspace'
INPUT_VIDEOS_DIR = os.path.join(WORKSPACE_DIR, 'input_videos')
OUTPUT_VIDEOS_DIR = os.path.join(WORKSPACE_DIR, 'output_videos_latest')
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024  # 10GB

# Job status storage (in-memory, can be replaced with database)
jobs = {}
job_lock = threading.Lock()

# Ensure directories exist
os.makedirs(INPUT_VIDEOS_DIR, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'workspace': WORKSPACE_DIR,
        'input_videos': INPUT_VIDEOS_DIR,
        'python_version': sys.version,
        'timestamp': time.time()
    })


@app.route('/status', methods=['GET'])
def status():
    """Get server status and workspace info"""
    workspace_exists = os.path.exists(WORKSPACE_DIR)
    input_videos_exists = os.path.exists(INPUT_VIDEOS_DIR)
    pipeline_exists = os.path.exists(os.path.join(WORKSPACE_DIR, 'pipeline.py'))
    wrapper_exists = os.path.exists(os.path.join(WORKSPACE_DIR, 'pipeline_wrapper.py'))
    
    # Check Python
    try:
        python_version = subprocess.check_output(['python', '--version'], stderr=subprocess.STDOUT).decode().strip()
    except:
        python_version = 'Unknown'
    
    return jsonify({
        'status': 'online',
        'workspace': {
            'path': WORKSPACE_DIR,
            'exists': workspace_exists
        },
        'input_videos': {
            'path': INPUT_VIDEOS_DIR,
            'exists': input_videos_exists
        },
        'files': {
            'pipeline_py': pipeline_exists,
            'pipeline_wrapper_py': wrapper_exists
        },
        'python': python_version,
        'timestamp': time.time()
    })


@app.route('/upload', methods=['POST'])
def upload_file():
    """Upload video file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: ' + ', '.join(ALLOWED_EXTENSIONS)}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(INPUT_VIDEOS_DIR, filename)
        file.save(filepath)
        
        # Get file size
        file_size = os.path.getsize(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'path': f'input_videos/{filename}',
            'full_path': filepath,
            'size': file_size,
            'message': 'File uploaded successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@app.route('/jobs', methods=['GET'])
def list_jobs():
    """List all jobs"""
    with job_lock:
        return jsonify({
            'jobs': list(jobs.values()),
            'count': len(jobs)
        })


@app.route('/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    """Get job status"""
    try:
        with job_lock:
            if job_id not in jobs:
                return jsonify({'error': 'Job not found'}), 404
            
            job = jobs[job_id].copy()
            # Ensure all required fields are present
            if 'status' not in job:
                job['status'] = 'unknown'
            if 'progress' not in job:
                job['progress'] = 0
            if 'updated_at' not in job:
                job['updated_at'] = time.time()
            
            return jsonify(job)
    except Exception as e:
        print(f"[API] Error getting job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to get job: {str(e)}'}), 500


@app.route('/jobs', methods=['POST'])
def create_job():
    """Create and execute a new job"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        job_id = f"job_{int(time.time() * 1000)}"
        
        job = {
            'id': job_id,
            'status': 'pending',
            'progress': 0,
            'input_method': data.get('inputMethod') or data.get('input_method'),
            'youtube_url': data.get('youtubeUrl') or data.get('youtube_url'),
            'manual_path': data.get('manualPath') or data.get('manual_path'),
            'unet_flag': data.get('unetFlag') if 'unetFlag' in data else data.get('unet_flag', False),
            'face_restore_flag': data.get('faceRestoreFlag') if 'faceRestoreFlag' in data else data.get('face_restore_flag', False),
            'upscale_flag': data.get('upscaleFlag') if 'upscaleFlag' in data else data.get('upscale_flag', False),
            'upscale_value': float(data.get('upscaleValue') if 'upscaleValue' in data else data.get('upscale_value', 2.0)),
            'clahe_flag': data.get('claheFlag') if 'claheFlag' in data else data.get('clahe_flag', False),
            'created_at': time.time(),
            'updated_at': time.time(),
            'output': '',
            'error': None
        }
        
        print(f"[API] Creating job {job_id} with data: {job}")
        
        with job_lock:
            jobs[job_id] = job
        
        # Execute job in background
        thread = threading.Thread(target=execute_job, args=(job_id, job))
        thread.daemon = True
        thread.start()
        
        return jsonify(job), 201
    except Exception as e:
        print(f"[API] Error creating job: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def execute_job(job_id, job):
    """Execute pipeline job"""
    try:
        print(f"[API] Starting job execution: {job_id}")
        with job_lock:
            jobs[job_id]['status'] = 'running'
            jobs[job_id]['progress'] = 5
            jobs[job_id]['updated_at'] = time.time()
        
        # Build command
        command = build_pipeline_command(job)
        
        # Change to workspace directory
        original_cwd = os.getcwd()
        os.chdir(WORKSPACE_DIR)
        print(f"[API] Changed to workspace: {WORKSPACE_DIR}")
        
        # Execute pipeline
        print(f"[API] Executing command: {command}")
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            cwd=WORKSPACE_DIR
        )
        
        output_lines = []
        last_progress_update = time.time()
        
        for line in process.stdout:
            output_lines.append(line)
            print(f"[Job {job_id}] {line.strip()}")
            
            # Update progress (simple parsing)
            progress = parse_progress(line)
            current_time = time.time()
            if progress is not None:
                with job_lock:
                    jobs[job_id]['progress'] = min(progress, 95)  # Keep at 95% until complete
                    jobs[job_id]['updated_at'] = current_time
                    last_progress_update = current_time
            elif current_time - last_progress_update > 10:
                # Increment progress slowly if no progress detected
                with job_lock:
                    current_progress = jobs[job_id].get('progress', 5)
                    if current_progress < 90:
                        jobs[job_id]['progress'] = min(current_progress + 1, 90)
                        jobs[job_id]['updated_at'] = current_time
                        last_progress_update = current_time
        
        process.wait()
        os.chdir(original_cwd)
        
        with job_lock:
            jobs[job_id]['output'] = ''.join(output_lines)
            jobs[job_id]['updated_at'] = time.time()
            
            if process.returncode == 0:
                jobs[job_id]['status'] = 'completed'
                jobs[job_id]['progress'] = 100
                # Find output files
                output_files = find_output_files(jobs[job_id])
                jobs[job_id]['output_files'] = output_files
                print(f"[API] Job {job_id} completed successfully with {len(output_files)} output files")
            else:
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['error'] = f'Pipeline failed with exit code {process.returncode}'
                print(f"[API] Job {job_id} failed with exit code {process.returncode}")
                
    except Exception as e:
        print(f"[API] Error executing job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        with job_lock:
            jobs[job_id]['status'] = 'failed'
            jobs[job_id]['error'] = str(e)
            jobs[job_id]['updated_at'] = time.time()


def build_pipeline_command(job):
    """Build pipeline command"""
    parts = ['python', 'pipeline_wrapper.py']
    
    input_method = job.get('input_method', 'manual')
    
    if input_method == 'youtube':
        youtube_url = job.get('youtube_url') or job.get('youtubeUrl')
        if youtube_url:
            parts.append(f'"{youtube_url}"')
        else:
            raise ValueError('YouTube URL is required for youtube input method')
    else:
        # Resolve manual path
        manual_path = job.get('manual_path') or job.get('manualPath')
        if not manual_path:
            raise ValueError('Manual path is required for manual input method')
        
        if not manual_path.startswith('/'):
            manual_path = os.path.join(WORKSPACE_DIR, manual_path)
        parts.append(manual_path)
    
    # Add flags (handle both camelCase and snake_case)
    parts.append('true' if job.get('unet_flag') or job.get('unetFlag') else 'false')
    parts.append('true' if job.get('face_restore_flag') or job.get('faceRestoreFlag') else 'false')
    parts.append('true' if job.get('upscale_flag') or job.get('upscaleFlag') else 'false')
    parts.append(str(job.get('upscale_value') or job.get('upscaleValue', 2.0)))
    parts.append('true' if job.get('clahe_flag') or job.get('claheFlag') else 'false')
    
    command = ' '.join(parts)
    print(f"[API] Built command: {command}")
    return command


def parse_progress(line):
    """Parse progress from output line"""
    # Look for progress patterns
    import re
    progress_match = re.search(r'Progress:\s*(\d+)%', line, re.IGNORECASE)
    if progress_match:
        return int(progress_match.group(1))
    
    # Look for task progress
    task_match = re.search(r'Task\s+(\d+)\s*/\s*(\d+)', line, re.IGNORECASE)
    if task_match:
        current = int(task_match.group(1))
        total = int(task_match.group(2))
        return int((current / total) * 100)
    
    return None


def get_original_video_name(job):
    """Extract original video name from job"""
    input_method = job.get('input_method', 'manual')
    
    if input_method == 'youtube':
        # For YouTube, the video is downloaded and stored with a name
        # We need to check the output to find the actual video name
        # Or we can try to find the most recent file in input_videos
        # For now, try to extract from output or use a default pattern
        youtube_url = job.get('youtube_url') or job.get('youtubeUrl', '')
        # Try to find video files that might have been created
        if os.path.exists(INPUT_VIDEOS_DIR):
            video_files = [f for f in os.listdir(INPUT_VIDEOS_DIR) 
                          if any(f.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)]
            if video_files:
                # Get the most recent file that might match this job
                video_files.sort(key=lambda f: os.path.getmtime(os.path.join(INPUT_VIDEOS_DIR, f)), reverse=True)
                return os.path.splitext(video_files[0])[0]
    else:
        # For manual path, extract filename
        manual_path = job.get('manual_path') or job.get('manualPath', '')
        if manual_path:
            # Remove path and extension
            filename = os.path.basename(manual_path)
            return os.path.splitext(filename)[0]
    
    return None


def find_output_files(job):
    """Find output files for a completed job"""
    video_name = get_original_video_name(job)
    if not video_name:
        print(f"[API] Cannot find video name for job")
        return []
    
    # Path structure: output_videos_latest/video_name/final_without_post_process_some_id/
    video_output_dir = os.path.join(OUTPUT_VIDEOS_DIR, video_name)
    if not os.path.exists(video_output_dir):
        print(f"[API] Video output directory does not exist: {video_output_dir}")
        return []
    
    output_files = []
    try:
        # Look for subdirectories that start with "final_without_post_process_"
        for item in os.listdir(video_output_dir):
            item_path = os.path.join(video_output_dir, item)
            
            # Check if it's a directory that matches the pattern
            if os.path.isdir(item_path) and item.startswith('final_without_post_process_'):
                print(f"[API] Found output directory: {item_path}")
                
                # Look for video files inside this directory
                for filename in os.listdir(item_path):
                    filepath = os.path.join(item_path, filename)
                    
                    # Check if it's a video file
                    if os.path.isfile(filepath) and any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                        print(f"[API] Found output file: {filepath}")
                        output_files.append({
                            'name': filename,
                            'path': filepath,
                            'size': os.path.getsize(filepath),
                            'modified': os.path.getmtime(filepath),
                            'relative_path': os.path.relpath(filepath, WORKSPACE_DIR),
                            'directory': item  # Store the subdirectory name for reference
                        })
                
                # If we found files in this directory, we're done (there should only be one file)
                if output_files:
                    break
        
        # If no files found in subdirectories, check the video_name directory directly (fallback)
        if not output_files:
            print(f"[API] No files found in subdirectories, checking video directory directly")
            for filename in os.listdir(video_output_dir):
                filepath = os.path.join(video_output_dir, filename)
                if os.path.isfile(filepath) and any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                    output_files.append({
                        'name': filename,
                        'path': filepath,
                        'size': os.path.getsize(filepath),
                        'modified': os.path.getmtime(filepath),
                        'relative_path': os.path.relpath(filepath, WORKSPACE_DIR)
                    })
        
        # Sort by modified time, most recent first
        output_files.sort(key=lambda f: f['modified'], reverse=True)
        print(f"[API] Found {len(output_files)} output file(s) for video: {video_name}")
    except Exception as e:
        print(f"[API] Error finding output files: {e}")
        import traceback
        traceback.print_exc()
    
    return output_files


@app.route('/jobs/<job_id>/cancel', methods=['POST'])
def cancel_job(job_id):
    """Cancel a job"""
    with job_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        if jobs[job_id]['status'] in ['completed', 'failed', 'cancelled']:
            return jsonify({'error': 'Job cannot be cancelled'}), 400
        
        jobs[job_id]['status'] = 'cancelled'
        jobs[job_id]['updated_at'] = time.time()
        
        return jsonify(jobs[job_id])


@app.route('/files', methods=['GET'])
def list_files():
    """List files in input_videos directory"""
    try:
        files = []
        if os.path.exists(INPUT_VIDEOS_DIR):
            for filename in os.listdir(INPUT_VIDEOS_DIR):
                filepath = os.path.join(INPUT_VIDEOS_DIR, filename)
                if os.path.isfile(filepath):
                    files.append({
                        'name': filename,
                        'path': f'input_videos/{filename}',
                        'size': os.path.getsize(filepath),
                        'modified': os.path.getmtime(filepath)
                    })
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/jobs/<job_id>/outputs', methods=['GET'])
def list_job_outputs(job_id):
    """List output files for a job"""
    with job_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        
        # If job is completed, find output files
        if job['status'] == 'completed':
            output_files = find_output_files(job)
            # Update job with output files if not already set
            if 'output_files' not in job or not job.get('output_files'):
                job['output_files'] = output_files
            
            return jsonify({
                'job_id': job_id,
                'output_files': output_files,
                'count': len(output_files)
            })
        else:
            return jsonify({
                'job_id': job_id,
                'output_files': [],
                'count': 0,
                'message': 'Job not completed yet'
            })


@app.route('/jobs/<job_id>/download', methods=['GET'])
def download_job_output_no_filename(job_id):
    """Download output file from a job (without specifying filename)"""
    # Use empty string as filename to trigger "use first file" logic
    return download_job_output(job_id, '')

@app.route('/jobs/<job_id>/download/<path:filename>', methods=['GET'])
def download_job_output(job_id, filename):
    """Download an output file from a job"""
    with job_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        
        if job['status'] != 'completed':
            return jsonify({'error': 'Job not completed'}), 400
        
        # Find output files
        output_files = find_output_files(job)
        
        if not output_files:
            print(f"[API] No output files found for job {job_id}")
            # Try to find file directly in nested directory structure
            video_name = get_original_video_name(job)
            if video_name:
                video_output_dir = os.path.join(OUTPUT_VIDEOS_DIR, video_name)
                
                # Look in subdirectories that start with "final_without_post_process_"
                if os.path.exists(video_output_dir):
                    for item in os.listdir(video_output_dir):
                        item_path = os.path.join(video_output_dir, item)
                        if os.path.isdir(item_path) and item.startswith('final_without_post_process_'):
                            print(f"[API] Searching in directory: {item_path}")
                            
                            # Get all video files in this directory (should be only one)
                            for file_in_dir in os.listdir(item_path):
                                file_in_dir_path = os.path.join(item_path, file_in_dir)
                                if os.path.isfile(file_in_dir_path) and any(file_in_dir.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                                    output_files.append({
                                        'name': file_in_dir,
                                        'path': file_in_dir_path,
                                        'size': os.path.getsize(file_in_dir_path),
                                        'modified': os.path.getmtime(file_in_dir_path)
                                    })
                                    print(f"[API] Found file: {file_in_dir_path}")
                                    break
                            
                            # If we found a file, we're done (there should only be one)
                            if output_files:
                                break
        
        if not output_files:
            print(f"[API] No output files found for job {job_id}")
            print(f"[API] Video name: {get_original_video_name(job)}")
            return jsonify({'error': 'No output files found for this job'}), 404
        
        # Find the requested file
        requested_file = None
        
        # If filename is 'download' or empty, use the first file
        if filename == 'download' or not filename or filename == '':
            requested_file = output_files[0]
            print(f"[API] Using first available output file: {requested_file['name']}")
        else:
            # First, try to find exact match in output_files
            for output_file in output_files:
                if output_file['name'] == filename:
                    requested_file = output_file
                    break
            
            # If not found, try partial match
            if not requested_file:
                for output_file in output_files:
                    if filename in output_file['name'] or output_file['name'].endswith(filename):
                        requested_file = output_file
                        break
            
            # If still not found, use the first file
            if not requested_file:
                requested_file = output_files[0]
                print(f"[API] Filename not found, using first available file: {requested_file['name']}")
        
        if not requested_file or not os.path.exists(requested_file['path']):
            print(f"[API] Output file not found. Requested filename: {filename}")
            print(f"[API] Available output files: {[f['name'] for f in output_files]}")
            print(f"[API] Video name: {get_original_video_name(job)}")
            return jsonify({'error': 'Output file not found'}), 404
        
        # Security check: ensure file is within workspace
        try:
            abs_path = os.path.abspath(requested_file['path'])
            abs_workspace = os.path.abspath(WORKSPACE_DIR)
            if not abs_path.startswith(abs_workspace):
                return jsonify({'error': 'Invalid file path'}), 403
        except Exception as e:
            return jsonify({'error': f'Path validation failed: {str(e)}'}), 500
        
        # Determine mimetype based on file extension
        mimetype = 'video/mp4'  # default
        filename_lower = requested_file['name'].lower()
        if filename_lower.endswith('.avi'):
            mimetype = 'video/x-msvideo'
        elif filename_lower.endswith('.mov'):
            mimetype = 'video/quicktime'
        elif filename_lower.endswith('.mkv'):
            mimetype = 'video/x-matroska'
        elif filename_lower.endswith('.webm'):
            mimetype = 'video/webm'
        
        # Send file
        try:
            return send_file(
                requested_file['path'],
                as_attachment=True,
                download_name=requested_file['name'],
                mimetype=mimetype
            )
        except Exception as e:
            return jsonify({'error': f'Failed to send file: {str(e)}'}), 500


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Remote API Server for Video Pipeline')
    parser.add_argument('--port', type=int, default=5000, help='Port to run server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to')
    args = parser.parse_args()
    
    print(f"Starting Remote API Server on {args.host}:{args.port}")
    print(f"Workspace: {WORKSPACE_DIR}")
    print(f"Input Videos: {INPUT_VIDEOS_DIR}")
    
    app.run(host=args.host, port=args.port, debug=False, threaded=True)

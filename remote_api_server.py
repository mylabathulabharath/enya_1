#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Remote API Server for Video Pipeline
This server runs inside Docker containers and handles job execution.
Install: pip install flask flask-cors
Run: python remote_api_server.py --hoot 0.0.0.0 --
port 9090
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
    with job_lock:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        return jsonify(jobs[job_id])


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
                print(f"[API] Job {job_id} completed successfully")
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


@app.route('/download', methods=['GET'])
def download_file():
    """Download a file from the workspace"""
    try:
        relative_path = request.args.get('path')
        if not relative_path:
            return jsonify({'error': 'Path parameter is required'}), 400

        normalized_path = os.path.normpath(relative_path).lstrip('/\\')
        full_path = os.path.join(WORKSPACE_DIR, normalized_path)
        full_path = os.path.normpath(full_path)

        if not full_path.startswith(os.path.normpath(WORKSPACE_DIR)):
            return jsonify({'error': 'Invalid path'}), 400

        if not os.path.isfile(full_path):
            return jsonify({'error': 'File not found'}), 404

        filename = os.path.basename(full_path)
        return send_file(full_path, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Remote API Server for Video Pipeline')
    parser.add_argument('--port', type=int, default=5000, help='Port to run server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to')
    args = parser.parse_args()
    
    print(f"Starting Remote API Server on {args.host}:{args.port}")
    print(f"Workspace: {WORKSPACE_DIR}")
    print(f"Input Videos: {INPUT_VIDEOS_DIR}")
    
    app.run(host=args.host, port=args.port, debug=False, threaded=True)

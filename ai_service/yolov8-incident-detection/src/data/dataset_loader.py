import os
import cv2
import numpy as np

def load_video_dataset(video_path):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    frames = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    
    cap.release()
    return frames

def load_annotation_file(annotation_path):
    if not os.path.exists(annotation_path):
        raise FileNotFoundError(f"Annotation file not found: {annotation_path}")

    with open(annotation_path, 'r') as file:
        annotations = file.readlines()
    
    return [parse_annotation(line) for line in annotations]

def parse_annotation(line):
    # Assuming the annotation format is: frame_number, x_min, y_min, x_max, y_max, class_id
    parts = line.strip().split(',')
    return {
        'frame_number': int(parts[0]),
        'bbox': [float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])],
        'class_id': int(parts[5])
    }

def prepare_dataset(video_path, annotation_path):
    frames = load_video_dataset(video_path)
    annotations = load_annotation_file(annotation_path)
    
    # Prepare data for training (e.g., resizing, normalization)
    processed_frames = [preprocess_frame(frame) for frame in frames]
    
    return processed_frames, annotations

def preprocess_frame(frame):
    # Resize frame to the desired input size for the model
    desired_size = (640, 640)  # Example size, adjust as needed
    frame = cv2.resize(frame, desired_size)
    frame = frame / 255.0  # Normalize to [0, 1]
    return frame.astype(np.float32)
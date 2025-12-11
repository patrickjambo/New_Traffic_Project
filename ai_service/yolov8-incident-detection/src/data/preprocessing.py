def resize_frame(frame, target_size=(640, 640)):
    return cv2.resize(frame, target_size)

def normalize_frame(frame):
    return frame / 255.0

def preprocess_frame(frame):
    frame = resize_frame(frame)
    frame = normalize_frame(frame)
    return frame

def preprocess_video(video_path):
    cap = cv2.VideoCapture(video_path)
    frames = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        processed_frame = preprocess_frame(frame)
        frames.append(processed_frame)
    
    cap.release()
    return frames

def save_preprocessed_frames(frames, output_path):
    for i, frame in enumerate(frames):
        cv2.imwrite(f"{output_path}/frame_{i:04d}.jpg", frame * 255)  # Convert back to 0-255 range for saving

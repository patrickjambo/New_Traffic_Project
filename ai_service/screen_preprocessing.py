"""
Screen Capture Preprocessing Module for YOLO Training
This module provides preprocessing functions to enhance detection accuracy
for videos captured from screens during presentations.
"""
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import random


def preprocess_screen_capture(frame):
    """
    Preprocess screen-captured frames before YOLO detection.
    Enhances image quality by removing screen artifacts and improving contrast.
    
    Args:
        frame: OpenCV image (numpy array)
        
    Returns:
        Preprocessed OpenCV image
    """
    # 1. Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    
    # 2. Reduce noise (from screen and camera sensor)
    denoised = cv2.fastNlMeansDenoisingColored(enhanced, None, 10, 10, 7, 21)
    
    # 3. Sharpen image to compensate for screen blur
    kernel = np.array([[-1, -1, -1],
                       [-1,  9, -1],
                       [-1, -1, -1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    
    # 4. Auto white balance
    result = auto_white_balance(sharpened)
    
    return result


def auto_white_balance(image):
    """
    Apply automatic white balance to compensate for screen color temperature
    """
    result = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    avg_a = np.average(result[:, :, 1])
    avg_b = np.average(result[:, :, 2])
    result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result = cv2.cvtColor(result, cv2.COLOR_LAB2BGR)
    return result


def add_screen_effects(image, intensity=1.0):
    """
    Add screen capture effects to training data for data augmentation.
    Use this to create synthetic training data from real traffic videos.
    
    Args:
        image: OpenCV image (numpy array)
        intensity: Effect intensity (0.0 to 1.0)
        
    Returns:
        Augmented OpenCV image with screen capture effects
    """
    # Convert to PIL Image for easier manipulation
    img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    
    # 1. Add brightness variation (screen brightness)
    brightness_factor = random.uniform(0.7, 1.3) * intensity
    brightness = ImageEnhance.Brightness(img)
    img = brightness.enhance(brightness_factor)
    
    # 2. Add contrast variation
    contrast_factor = random.uniform(0.8, 1.2) * intensity
    contrast = ImageEnhance.Contrast(img)
    img = contrast.enhance(contrast_factor)
    
    # Convert back to OpenCV format
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    
    # 3. Add slight blur (camera focus issues)
    if random.random() > 0.5:
        kernel_size = random.choice([3, 5])
        img_cv = cv2.GaussianBlur(img_cv, (kernel_size, kernel_size), 0)
    
    # 4. Add noise (camera sensor noise)
    noise_level = random.uniform(5, 15) * intensity
    noise = np.random.normal(0, noise_level, img_cv.shape)
    img_cv = np.clip(img_cv + noise, 0, 255).astype(np.uint8)
    
    # 5. Add perspective transform (filming at an angle)
    if random.random() > 0.5:
        img_cv = add_perspective_transform(img_cv, intensity)
    
    # 6. Add moiré pattern (optional, screen interference)
    if random.random() > 0.7:
        img_cv = add_moire_pattern(img_cv, intensity)
    
    # 7. Add screen glare spots
    if random.random() > 0.6:
        img_cv = add_glare_spots(img_cv, intensity)
    
    return img_cv


def add_perspective_transform(image, intensity=1.0):
    """
    Simulate filming screen at an angle
    """
    h, w = image.shape[:2]
    
    # Random perspective points
    offset = int(random.randint(10, 30) * intensity)
    pts1 = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
    pts2 = np.float32([
        [random.randint(0, offset), random.randint(0, offset)],
        [w - random.randint(0, offset), random.randint(0, offset)],
        [random.randint(0, offset), h - random.randint(0, offset)],
        [w - random.randint(0, offset), h - random.randint(0, offset)]
    ])
    
    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    result = cv2.warpPerspective(image, matrix, (w, h))
    return result


def add_moire_pattern(image, intensity=1.0):
    """
    Add moiré pattern from screen pixels
    """
    h, w = image.shape[:2]
    x = np.arange(w)
    y = np.arange(h)
    X, Y = np.meshgrid(x, y)
    
    # Create wave pattern with random frequency
    freq = random.uniform(0.05, 0.15)
    pattern = np.sin(X * freq) * np.sin(Y * freq) * (10 * intensity)
    pattern = pattern.astype(np.uint8)
    
    # Expand to 3 channels
    pattern_3ch = np.zeros_like(image)
    pattern_3ch[:, :, 0] = pattern
    pattern_3ch[:, :, 1] = pattern
    pattern_3ch[:, :, 2] = pattern
    
    # Blend with original image
    alpha = 0.05 * intensity
    result = cv2.addWeighted(image, 1 - alpha, pattern_3ch, alpha, 0)
    return result


def add_glare_spots(image, intensity=1.0):
    """
    Add screen glare/reflection spots
    """
    h, w = image.shape[:2]
    result = image.copy()
    
    # Add 1-3 random glare spots
    num_spots = random.randint(1, 3)
    for _ in range(num_spots):
        # Random position
        center_x = random.randint(0, w)
        center_y = random.randint(0, h)
        
        # Random size
        radius = random.randint(30, 100)
        
        # Create circular mask
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, (center_x, center_y), radius, 255, -1)
        mask = cv2.GaussianBlur(mask, (51, 51), 0)
        
        # Create bright spot
        brightness = int(100 * intensity)
        bright_layer = result.copy()
        bright_layer = cv2.addWeighted(bright_layer, 1.0, 
                                       np.full_like(bright_layer, brightness), 
                                       0.5, 0)
        
        # Apply mask
        mask_3ch = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR) / 255.0
        result = (result * (1 - mask_3ch) + bright_layer * mask_3ch).astype(np.uint8)
    
    return result


def augment_training_video(input_video_path, output_folder, frames_per_second=5):
    """
    Process a training video and create screen-captured augmented versions.
    
    Args:
        input_video_path: Path to input video
        output_folder: Folder to save augmented frames
        frames_per_second: How many frames to sample per second
        
    Returns:
        Number of frames created
    """
    import os
    os.makedirs(output_folder, exist_ok=True)
    
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps / frames_per_second)
    
    frame_count = 0
    saved_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Only process every Nth frame
        if frame_count % frame_interval == 0:
            # Create 3 augmented versions with different intensities
            for i, intensity in enumerate([0.7, 1.0, 1.3]):
                augmented = add_screen_effects(frame, intensity=intensity)
                output_path = f"{output_folder}/frame_{saved_count:06d}_i{i}.jpg"
                cv2.imwrite(output_path, augmented)
            
            saved_count += 1
            if saved_count % 10 == 0:
                print(f"✅ Processed {saved_count} frames... ({saved_count * 3} images created)")
        
        frame_count += 1
    
    cap.release()
    total_images = saved_count * 3
    print(f"\n🎉 Dataset augmentation complete!")
    print(f"   📊 Total frames processed: {saved_count}")
    print(f"   🖼️  Total images created: {total_images}")
    print(f"   📁 Saved to: {output_folder}")
    
    return total_images


# Example usage
if __name__ == "__main__":
    # Example 1: Preprocess a single frame for detection
    test_frame = cv2.imread("test_screen_capture.jpg")
    if test_frame is not None:
        preprocessed = preprocess_screen_capture(test_frame)
        cv2.imwrite("preprocessed_output.jpg", preprocessed)
        print("✅ Preprocessed frame saved to preprocessed_output.jpg")
    
    # Example 2: Create augmented training dataset
    # augment_training_video(
    #     input_video_path="training_videos/accident_video.mp4",
    #     output_folder="augmented_dataset/accidents",
    #     frames_per_second=5
    # )

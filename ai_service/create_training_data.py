#!/usr/bin/env python3
"""
Training Data Augmentation for Screen Capture Detection
========================================================
This script creates augmented training data by adding screen capture effects
to your existing traffic videos.

Usage:
    python create_training_data.py --input ./training_videos --output ./augmented_dataset
"""

import argparse
import cv2
from pathlib import Path
from screen_preprocessing import add_screen_effects, augment_training_video


def batch_augment_videos(input_dir, output_dir, frames_per_second=5):
    """
    Batch process all videos in a directory
    
    Args:
        input_dir: Directory containing training videos
        output_dir: Directory to save augmented frames
        frames_per_second: Frames to extract per second
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    if not input_path.exists():
        print(f"❌ Error: Input directory not found: {input_dir}")
        return
    
    # Find all video files
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    video_files = []
    for ext in video_extensions:
        video_files.extend(input_path.glob(f'**/*{ext}'))
    
    if not video_files:
        print(f"❌ No video files found in {input_dir}")
        return
    
    print(f"📁 Found {len(video_files)} video files")
    print(f"📊 Will create ~{len(video_files) * 3 * frames_per_second * 10} training images")
    print(f"💾 Output directory: {output_dir}\n")
    
    total_images = 0
    
    for i, video_file in enumerate(video_files, 1):
        print(f"\n[{i}/{len(video_files)}] Processing: {video_file.name}")
        
        # Create output folder for this video
        video_output = output_path / video_file.stem
        
        # Augment video
        count = augment_training_video(
            str(video_file),
            str(video_output),
            frames_per_second=frames_per_second
        )
        
        total_images += count
    
    print(f"\n{'='*60}")
    print(f"🎉 BATCH PROCESSING COMPLETE!")
    print(f"{'='*60}")
    print(f"✅ Processed: {len(video_files)} videos")
    print(f"🖼️  Created: {total_images} training images")
    print(f"📁 Saved to: {output_dir}")
    print(f"\n💡 Next Steps:")
    print(f"   1. Label these images using Roboflow or CVAT")
    print(f"   2. Export to YOLO format")
    print(f"   3. Fine-tune your model using train_yolo_screen.py")


def test_single_frame(image_path, output_path):
    """
    Test augmentation on a single image
    """
    print(f"📸 Testing augmentation on: {image_path}")
    
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Could not read image: {image_path}")
        return
    
    # Create 5 different augmented versions
    for i in range(5):
        augmented = add_screen_effects(img, intensity=1.0)
        output_file = f"{output_path}/augmented_{i}.jpg"
        cv2.imwrite(output_file, augmented)
        print(f"   ✅ Saved: {output_file}")
    
    print(f"\n✅ Created 5 augmented versions")


def main():
    parser = argparse.ArgumentParser(
        description="Create augmented training data for screen capture detection",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Augment all videos in a directory
  %(prog)s --input ./training_videos --output ./augmented_dataset
  
  # Test on single image
  %(prog)s --test_image test.jpg --output ./test_output
  
  # Adjust frame sampling rate
  %(prog)s --input ./videos --output ./dataset --fps 10
        """
    )
    
    parser.add_argument(
        '--input',
        type=str,
        help='Input directory containing training videos'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='Output directory for augmented images'
    )
    
    parser.add_argument(
        '--fps',
        type=int,
        default=5,
        help='Frames to extract per second (default: 5)'
    )
    
    parser.add_argument(
        '--test_image',
        type=str,
        help='Test augmentation on single image'
    )
    
    args = parser.parse_args()
    
    if args.test_image:
        if not args.output:
            print("❌ Error: --output is required for test_image mode")
            return
        test_single_frame(args.test_image, args.output)
    
    elif args.input and args.output:
        batch_augment_videos(args.input, args.output, args.fps)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🎨 Training Data Augmentation for YOLO v8 🎨         ║
║                                                              ║
║          Screen Capture Detection Enhancement               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    main()

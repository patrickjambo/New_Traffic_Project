# YOLOv8 Incident Detection System

This project implements an incident detection system using the YOLOv8 model, designed to work with screen-captured videos and integrate with an existing mobile app and backend. The system is capable of training on various datasets, including real-world and screen-captured videos, and provides inference capabilities for detecting incidents in new video data.

## Project Structure

```
yolov8-incident-detection
├── src
│   ├── main.py                # Entry point for the application
│   ├── train.py               # Training logic for the YOLOv8 model
│   ├── inference.py           # Inference process for predictions
│   ├── data
│   │   ├── dataset_loader.py   # Functions for loading datasets
│   │   ├── augmentation.py      # Data augmentation techniques
│   │   └── preprocessing.py     # Preprocessing functions for video frames
│   ├── models
│   │   ├── yolov8_config.py     # YOLOv8 model configuration settings
│   │   └── model_utils.py       # Utility functions for model management
│   ├── utils
│   │   ├── screen_capture.py     # Functions for capturing video from the screen
│   │   ├── video_processor.py    # Functions for processing video files
│   │   └── logger.py             # Logging functionality
│   └── api
│       ├── client.py            # Client-side code for backend API interaction
│       └── endpoints.py         # API endpoints for incident detection
├── data
│   ├── raw                      # Directory for raw video data
│   ├── processed                # Directory for processed video data
│   ├── annotations              # Directory for annotation files
│   └── splits                   # Directory for dataset splits
├── models
│   ├── weights                  # Directory for trained model weights
│   └── checkpoints              # Directory for model checkpoints
├── configs
│   ├── training_config.yaml     # Configuration settings for training
│   └── inference_config.yaml    # Configuration settings for inference
├── notebooks
│   └── exploratory_analysis.ipynb # Jupyter notebook for exploratory data analysis
├── tests
│   ├── test_inference.py        # Unit tests for inference functionality
│   └── test_preprocessing.py     # Unit tests for preprocessing functions
├── requirements.txt             # Python dependencies for the project
├── setup.py                     # Project packaging and metadata
└── README.md                    # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd yolov8-incident-detection
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Configure the training and inference settings in the `configs` directory as needed.

4. Run the training script:
   ```
   python src/train.py
   ```

5. For inference on new video data, use:
   ```
   python src/inference.py
   ```

## Usage Guidelines

- The `src/main.py` file serves as the entry point for the application, allowing users to select between complete or manual workflows.
- Data should be placed in the appropriate directories under `data/raw`, `data/processed`, and `data/annotations`.
- Model weights and checkpoints will be saved in the `models/weights` and `models/checkpoints` directories, respectively.

## Overview of the Incident Detection System

The incident detection system leverages the YOLOv8 model to identify and classify incidents in video footage. By utilizing screen-captured videos, the system can effectively monitor and analyze incidents in real-time, providing valuable insights and alerts to users through the integrated mobile app and backend services.

For further details, please refer to the individual file documentation and comments within the code.
# yolov8_config.py

class YOLOv8Config:
    def __init__(self):
        # Model architecture parameters
        self.input_size = (640, 640)  # Input size for the model
        self.num_classes = 1  # Number of classes for incident detection
        self.anchors = [
            [12, 16], [19, 36], [40, 28],  # Small objects
            [36, 75], [76, 55], [72, 146],  # Medium objects
            [142, 110], [192, 243], [459, 401]  # Large objects
        ]

        # Training hyperparameters
        self.learning_rate = 0.001  # Learning rate for the optimizer
        self.batch_size = 16  # Batch size for training
        self.num_epochs = 50  # Number of epochs for training
        self.momentum = 0.9  # Momentum for the optimizer
        self.weight_decay = 0.0005  # Weight decay for regularization

        # Paths for dataset and model
        self.train_data_path = '../data/processed/train'  # Path to training data
        self.val_data_path = '../data/processed/val'  # Path to validation data
        self.model_weights_path = '../models/weights/yolov8_weights.pth'  # Path to save model weights

        # Logging and checkpointing
        self.checkpoint_path = '../models/checkpoints/'  # Path to save checkpoints
        self.log_dir = '../logs/'  # Directory for logging training progress

    def display_config(self):
        print("YOLOv8 Configuration:")
        print(f"Input Size: {self.input_size}")
        print(f"Number of Classes: {self.num_classes}")
        print(f"Learning Rate: {self.learning_rate}")
        print(f"Batch Size: {self.batch_size}")
        print(f"Number of Epochs: {self.num_epochs}")
        print(f"Train Data Path: {self.train_data_path}")
        print(f"Validation Data Path: {self.val_data_path}")
        print(f"Model Weights Path: {self.model_weights_path}")
        print(f"Checkpoint Path: {self.checkpoint_path}")
        print(f"Log Directory: {self.log_dir}")
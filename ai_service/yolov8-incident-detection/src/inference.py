import cv2
import torch
import numpy as np
from models.yolov8_config import YOLOv8Config

class Inference:
    def __init__(self, model_path, config_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self.load_model(model_path)
        self.config = YOLOv8Config(config_path)

    def load_model(self, model_path):
        model = torch.hub.load('ultralytics/yolov8', 'custom', path=model_path)
        model.to(self.device)
        model.eval()
        return model

    def preprocess_frame(self, frame):
        img = cv2.resize(frame, (self.config.input_size, self.config.input_size))
        img = img / 255.0  # Normalize to [0, 1]
        img = np.transpose(img, (2, 0, 1))  # Change to (C, H, W)
        img = np.expand_dims(img, axis=0)  # Add batch dimension
        return torch.tensor(img, dtype=torch.float32).to(self.device)

    def run_inference(self, video_path):
        cap = cv2.VideoCapture(video_path)
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            processed_frame = self.preprocess_frame(frame)
            with torch.no_grad():
                predictions = self.model(processed_frame)

            self.display_results(frame, predictions)

        cap.release()
        cv2.destroyAllWindows()

    def display_results(self, frame, predictions):
        for pred in predictions.xyxy[0]:  # xyxy format
            x1, y1, x2, y2, conf, cls = pred
            label = f'Class: {int(cls)}, Conf: {conf:.2f}'
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
            cv2.putText(frame, label, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

        cv2.imshow('Inference', frame)
        cv2.waitKey(1)

if __name__ == "__main__":
    model_path = 'models/weights/best.pt'  # Path to the trained model weights
    config_path = 'configs/inference_config.yaml'  # Path to the inference configuration
    video_path = 'data/raw/sample_video.mp4'  # Path to the input video

    inference = Inference(model_path, config_path)
    inference.run_inference(video_path)
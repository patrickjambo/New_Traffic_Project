import os
import yaml
import torch
from models.yolov8_config import YOLOv8Config
from data.dataset_loader import load_dataset
from data.augmentation import augment_data
from data.preprocessing import preprocess_data
from utils.logger import setup_logger

class YOLOv8Trainer:
    def __init__(self, config_path):
        self.config = self.load_config(config_path)
        self.logger = setup_logger(self.config['logging'])
        self.model = self.initialize_model()
        self.train_loader, self.val_loader = self.prepare_data()

    def load_config(self, config_path):
        with open(config_path, 'r') as file:
            return yaml.safe_load(file)

    def initialize_model(self):
        model = YOLOv8Config(self.config['model'])
        if torch.cuda.is_available():
            model = model.cuda()
        return model

    def prepare_data(self):
        train_dataset, val_dataset = load_dataset(self.config['data'])
        train_dataset = augment_data(train_dataset)
        train_loader = preprocess_data(train_dataset, self.config['training']['batch_size'])
        val_loader = preprocess_data(val_dataset, self.config['training']['batch_size'])
        return train_loader, val_loader

    def train(self):
        self.model.train()
        for epoch in range(self.config['training']['epochs']):
            for images, targets in self.train_loader:
                if torch.cuda.is_available():
                    images, targets = images.cuda(), targets.cuda()
                # Training logic here
                self.logger.info(f"Epoch [{epoch+1}/{self.config['training']['epochs']}]: Training...")

            self.validate()

    def validate(self):
        self.model.eval()
        with torch.no_grad():
            for images, targets in self.val_loader:
                if torch.cuda.is_available():
                    images, targets = images.cuda(), targets.cuda()
                # Validation logic here
                self.logger.info("Validation...")

if __name__ == "__main__":
    trainer = YOLOv8Trainer(config_path='configs/training_config.yaml')
    trainer.train()
import cv2
import numpy as np

def random_flip(image):
    if np.random.rand() > 0.5:
        return cv2.flip(image, 1)  # Flip horizontally
    return image

def random_brightness(image, max_delta=0.2):
    delta = np.random.uniform(-max_delta, max_delta)
    image = cv2.convertScaleAbs(image, alpha=1, beta=delta * 255)
    return image

def random_contrast(image, lower=0.5, upper=1.5):
    factor = np.random.uniform(lower, upper)
    image = cv2.convertScaleAbs(image, alpha=factor, beta=0)
    return image

def random_noise(image):
    noise = np.random.normal(0, 25, image.shape).astype(np.uint8)
    noisy_image = cv2.add(image, noise)
    return noisy_image

def augment_image(image):
    image = random_flip(image)
    image = random_brightness(image)
    image = random_contrast(image)
    image = random_noise(image)
    return image

def augment_dataset(images):
    augmented_images = []
    for image in images:
        augmented_images.append(augment_image(image))
    return augmented_images
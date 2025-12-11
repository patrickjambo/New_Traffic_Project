import cv2
import numpy as np

def capture_screen(output_file, duration=10):
    """
    Captures the screen and saves it to a video file.

    Parameters:
    - output_file: str, the path to save the captured video.
    - duration: int, the duration of the capture in seconds.
    """
    screen_size = (1920, 1080)  # Set the screen size (width, height)
    fourcc = cv2.VideoWriter_fourcc(*"XVID")
    out = cv2.VideoWriter(output_file, fourcc, 20.0, screen_size)

    start_time = cv2.getTickCount()
    while True:
        img = np.array(cv2.VideoCapture(0).read()[1])  # Capture frame from screen
        img = cv2.resize(img, screen_size)
        out.write(img)

        elapsed_time = (cv2.getTickCount() - start_time) / cv2.getTickFrequency()
        if elapsed_time > duration:
            break

    out.release()
    cv2.destroyAllWindows()

def capture_and_process(output_file, duration=10):
    """
    Captures the screen and processes the video for incident detection.

    Parameters:
    - output_file: str, the path to save the captured video.
    - duration: int, the duration of the capture in seconds.
    """
    capture_screen(output_file, duration)
    # Additional processing can be added here if needed.
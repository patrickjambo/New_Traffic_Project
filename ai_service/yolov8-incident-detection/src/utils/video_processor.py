def extract_frames(video_path, output_folder, frame_rate=1):
    import cv2
    import os

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    video_capture = cv2.VideoCapture(video_path)
    frame_count = 0
    success, image = video_capture.read()

    while success:
        if frame_count % frame_rate == 0:
            frame_filename = os.path.join(output_folder, f"frame_{frame_count}.jpg")
            cv2.imwrite(frame_filename, image)
        success, image = video_capture.read()
        frame_count += 1

    video_capture.release()
    cv2.destroyAllWindows()


def convert_video_format(input_video_path, output_video_path, codec='mp4v'):
    import cv2

    video_capture = cv2.VideoCapture(input_video_path)
    fourcc = cv2.VideoWriter_fourcc(*codec)
    fps = video_capture.get(cv2.CAP_PROP_FPS)
    width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    while True:
        success, frame = video_capture.read()
        if not success:
            break
        video_writer.write(frame)

    video_capture.release()
    video_writer.release()
    cv2.destroyAllWindows()
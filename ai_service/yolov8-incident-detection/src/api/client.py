from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

API_URL = "http://backend-api-url"  # Replace with your backend API URL

@app.route('/detect', methods=['POST'])
def detect_incident():
    video_file = request.files.get('video')
    if not video_file:
        return jsonify({"error": "No video file provided"}), 400

    # Send the video file to the backend for processing
    response = requests.post(f"{API_URL}/process_video", files={'video': video_file})

    if response.status_code == 200:
        return jsonify(response.json()), 200
    else:
        return jsonify({"error": "Failed to process video"}), response.status_code

if __name__ == '__main__':
    app.run(debug=True)
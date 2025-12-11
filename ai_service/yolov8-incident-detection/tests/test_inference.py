import unittest
from src.inference import perform_inference

class TestInference(unittest.TestCase):

    def setUp(self):
        # Setup code to initialize necessary components for testing
        self.test_video_path = "data/raw/test_video.mp4"
        self.expected_output = "data/processed/test_output.json"

    def test_perform_inference(self):
        # Test the inference function with a sample video
        result = perform_inference(self.test_video_path)
        self.assertIsNotNone(result)
        self.assertTrue(isinstance(result, dict))
        self.assertIn("detections", result)
        self.assertGreater(len(result["detections"]), 0)

    def tearDown(self):
        # Cleanup code if necessary
        pass

if __name__ == "__main__":
    unittest.main()
import unittest
from src.data.preprocessing import preprocess_frame

class TestPreprocessing(unittest.TestCase):

    def test_preprocess_frame_resizing(self):
        # Test if the frame is resized correctly
        input_frame = ...  # Load a sample frame
        expected_shape = (640, 480, 3)  # Example expected shape
        processed_frame = preprocess_frame(input_frame)
        self.assertEqual(processed_frame.shape, expected_shape)

    def test_preprocess_frame_normalization(self):
        # Test if the frame is normalized correctly
        input_frame = ...  # Load a sample frame
        processed_frame = preprocess_frame(input_frame)
        self.assertTrue((processed_frame >= 0).all() and (processed_frame <= 1).all())

if __name__ == '__main__':
    unittest.main()
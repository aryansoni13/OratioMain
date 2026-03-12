import cv2
from deepface import DeepFace
import pandas as pd
import warnings
import os

# Suppress TensorFlow warnings for a cleaner output
warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'


def analyze_video_emotions(video_file_path: str, sample_rate: int = 1) -> pd.DataFrame:
    """
    Analyzes emotions by sampling frames and summing emotion scores using DeepFace.

    This method is efficient due to frame sampling and provides accurate results
    from modern models. The output DataFrame format is identical to the original
    fer-based script for seamless integration.

    Args:
        video_file_path (str): Path to the video file to be analyzed.
        sample_rate (int): The number of frames to process per second.
                           Defaults to 1.

    Returns:
        pd.DataFrame: A DataFrame with 'Human Emotions' and 'Emotion Value from the Video'.
    """
    try:
        cap = cv2.VideoCapture(video_file_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file {video_file_path}")
            return pd.DataFrame()

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = max(1, int(fps / sample_rate))

        # Initialize a dictionary to store the SUM of scores, not counts
        emotion_scores = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0, 'happy': 0.0,
            'sad': 0.0, 'surprise': 0.0, 'neutral': 0.0
        }
        
        frame_count = 0
        print(f"Starting emotion analysis for {video_file_path} at {sample_rate} FPS...")
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break # End of the video
            
            if frame_count % frame_interval == 0:
                try:
                    result = DeepFace.analyze(
                        img_path=frame,
                        actions=['emotion'],
                        enforce_detection=False,
                        detector_backend='opencv',
                        silent=True
                    )
                    
                    if result and result[0]:
                        # Get the dictionary of all emotion scores for the frame
                        frame_emotions = result[0]['emotion']
                        # Add each score to our running total
                        for emotion, score in frame_emotions.items():
                            if emotion in emotion_scores:
                                # DeepFace scores are percentages (0-100).
                                # We divide by 100 to get a probability (0-1) to match fer's scale.
                                emotion_scores[emotion] += (score / 100.0)
                except Exception:
                    pass
            
            frame_count += 1
            
        cap.release()
        print("Emotion analysis finished successfully.")

        # Create the DataFrame using the EXACT same column names as the original script
        score_comparisons = pd.DataFrame({
            'Human Emotions': [k.capitalize() for k in emotion_scores.keys()],
            'Emotion Value from the Video': list(emotion_scores.values())
        })

        return score_comparisons

    except Exception as e:
        print(f"An unexpected error occurred during emotion analysis: {e}")
        return pd.DataFrame()
import cv2
import numpy as np
import logging
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)

class FaceProcessingError(Exception):
    def __init__(self, code: str, detail: str):
        self.code = code
        self.detail = detail
        super().__init__(detail)

class FaceService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.app = None
        self.model_name = "buffalo_l"
        self.embedding_dimension = 512
        
        try:
            import insightface
            from insightface.app import FaceAnalysis
            
            # Using CPUExecutionProvider for robust local prototype
            self.app = FaceAnalysis(name=self.model_name, providers=['CPUExecutionProvider'])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace FaceAnalysis successfully initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize InsightFace: {e}")
            # Do not raise here, allow the app to start so admin UI works. We will raise when generating embedding.
            
    def _validate_quality(self, image: np.ndarray) -> None:
        """
        Validates the basic quality of the image:
        - Minimum resolution
        - Blur (Laplacian variance)
        - Basic brightness check
        """
        if image is None or image.size == 0:
            raise FaceProcessingError("face/invalid-image", "Image could not be read or is empty.")
            
        h, w = image.shape[:2]
        if h < 200 or w < 200:
            raise FaceProcessingError("face/resolution-too-low", "Image resolution must be at least 200x200 pixels.")

        # Blur detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 50.0:  # Threshold can be tuned. 50 is quite forgiving for webcams.
            raise FaceProcessingError("face/image-blurred", "Image is too blurry. Please hold still and ensure good lighting.")
            
        # Brightness detection
        mean_brightness = np.mean(gray)
        if mean_brightness < 40:
            raise FaceProcessingError("face/image-too-dark", "Image is too dark.")
        if mean_brightness > 240:
            raise FaceProcessingError("face/image-too-bright", "Image is too bright.")

    def detect_and_get_embedding(self, image_bytes: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Process raw image bytes, detect exactly one face, and return the embedding.
        Returns:
            embedding (np.ndarray): The float embedding array
            metadata (dict): Metadata about the model used
        """
        if not self.app:
            raise FaceProcessingError("face/model-unavailable", "Face recognition model failed to load on the server.")
            
        # Decode image
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        self._validate_quality(image)
        
        # InsightFace expects BGR image
        faces = self.app.get(image)
        
        if len(faces) == 0:
            raise FaceProcessingError("face/no-face-detected", "No face could be detected in the image.")
            
        if len(faces) > 1:
            raise FaceProcessingError("face/multiple-faces-detected", "Multiple faces detected. Ensure only one person is in the frame.")
            
        face = faces[0]
        
        # Verify face size relative to image to ensure they aren't too far away
        bbox = face.bbox
        face_width = bbox[2] - bbox[0]
        image_width = image.shape[1]
        
        if face_width < image_width * 0.15:
            raise FaceProcessingError("face/too-far", "Face is too far from the camera. Please move closer.")

        embedding = face.normed_embedding
        
        metadata = {
            "model_name": self.model_name,
            "embedding_dimension": self.embedding_dimension
        }
        
        return embedding, metadata

    def compare_faces(self, emb1: np.ndarray, emb2: np.ndarray, threshold: float = 0.45) -> bool:
        """
        Compare two normed embeddings using cosine similarity (dot product).
        Returns True if the similarity is above the threshold.
        InsightFace buffalo_l normed embeddings typically use a threshold between 0.4 to 0.5.
        """
        similarity = np.dot(emb1, emb2)
        return similarity >= threshold

face_service = FaceService()

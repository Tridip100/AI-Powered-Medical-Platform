import torch 
import torch.nn as nn
from torchvision import models
import os 
import logging

logger = logging.getLogger(__name__) 

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

models_dir = os.path.join(BASE_DIR, 'models')



organ_classes = [f"Class{i}" for i in range(27)]

chest_classes  = [
    "COVID-19", "Normal", "Pneumonia", "Tuberculosis", "Lung Opacity"
]

brain_classes  = [
    "Glioma", "Meningioma", "No Tumor", "Pituitary"
]

eye_classes    = [
    "Cataract", "Diabetic Retinopathy", "Glaucoma", "Normal",
    "Age-related Macular Degeneration", "Hypertensive Retinopathy",
    "Myopia", "Color Blindness", "Uveitis"
]
skin_classes   = [
    "Melanocytic Nevi", "Melanoma", "Benign Keratosis",
    "Basal Cell Carcinoma", "Actinic Keratosis",
    "Vascular Lesions", "Dermatofibroma"
]

bone_classes = [
    "Class0",
    "Class1",
    "Class2",
    "Class3"
]


knee_classes   = [
    "Grade 0 - Normal", "Grade 1 - Doubtful",
    "Grade 2 - Minimal", "Grade 3 - Moderate", "Grade 4 - Severe"
]
dental_classes = [
    "Caries", "Gingivitis", "Hypodontia",
    "Mouth Ulcer", "Tooth Discoloration", "Healthy"
]

organ_to_disease_model = {
    "Lungs":     "chest",
    "Heart":     "chest",
    "Brain":     "brain",
    "Eyes":      "eye",
    "Skin":      "skin",
    "Bones":     "bone",
    "Spine":     "bone",
    "Bladder":   "knee",
    "Kidneys":   "chest",  # fallback
}
 

def _resnet50_v1(num_classes):
    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes)
    )

    return m

def _skin_resnet50(num_classes):
    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes)
    )

    return m

def _organ_resnet50(num_classes):
    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.BatchNorm1d(512),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes)
    )

    return m
def _bone_resnet50(num_classes):
    m = models.resnet50(weights=None)

    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes)
    )

    return m






def _load_model(filename,build_fn, num_classes, device):
    path = os.path.join(models_dir, filename)
    if not os.path.exists(path):
        logger.warning(f"Model file {filename} not found at {path}. Returning untrained model.")
        return None
    
    try:
        model = build_fn(num_classes)
        state = torch.load(path, map_location=device)
        if isinstance(state, dict) and 'model_state_dict' in state:
            state = state['model_state_dict']
        elif isinstance(state, dict) and 'state_dict' in state:
            state = state['state_dict']
        model.load_state_dict(state)
        model.to(device)
        model.eval()
        logger.info(f"Model loaded successfully from {path}")
        return model
    except Exception as e:
        logger.error(f"Error loading model from {path}: {e}")
        return None
    

class ModelRegistry:
     """Singleton registry that holds all 8 trained models."""
 
     def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Device: {self.device}")
 
        self.organ  = None
        self.chest  = None
        self.brain  = None
        self.eye    = None
        self.skin   = None
        self.bone   = None
        self.knee   = None
        self.dental = None
 
        self.labels = {
            "organ":  organ_classes,
            "chest":  chest_classes,
            "brain":  brain_classes,
            "eye":    eye_classes,
            "skin":   skin_classes,
            "bone":   bone_classes,
            "knee":   knee_classes,
            "dental": dental_classes,
        }
     def load_all_models(self):
            """Load all 8 models from models/ directory."""
            self.organ = _load_model("organ_model_v2.pth", _organ_resnet50, len(organ_classes), self.device)

            self.chest = _load_model("chest_model.pth", _resnet50_v1, len(chest_classes),self.device)

            self.brain = _load_model("brain_model.pth",_resnet50_v1, len(brain_classes),self.device)

            self.skin = _load_model("skin_model.pth", _skin_resnet50, len(skin_classes),self.device)

            self.eye = _load_model("eye_model.pth", _resnet50_v1, len(eye_classes),self.device)

            self.bone = _load_model("bone_model.pth", _bone_resnet50, len(bone_classes),self.device)

            self.knee = _load_model("knee_model.pth", _resnet50_v1, len(knee_classes),self.device)

            self.dental = _load_model("dental_model.pth", _resnet50_v1, len(dental_classes),self.device)


     def get(self, name: str):
                return getattr(self, name, None)
            
     def status(self) -> dict:
                names= {
                    "organ":  self.organ is not None,
                    "chest":  self.chest is not None,
                    "brain":  self.brain is not None,
                    "eye":    self.eye is not None,
                    "skin":   self.skin is not None,
                    "bone":   self.bone is not None,
                    "knee":   self.knee is not None,
                    "dental": self.dental is not None,
                }
                return {n: getattr(self, n) is not None for n in names}

     def get_disease_model(self, organ_name: str):
                """Returns (key, model, labels) for an organ's disease model."""
                key = organ_to_disease_model.get(organ_name)
                if not key:
                    return None, None, None
                return key, self.get(key), self.labels.get(key, [])

        


registry = ModelRegistry()  
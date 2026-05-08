import torch 
import torch.nn as nn
from torchvision import models
import os 
import logging
import json

logger = logging.getLogger(__name__) 

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

models_dir = os.path.join(BASE_DIR, 'models')



def load_metadata(folder_name, metadata_file):
    path = os.path.join(models_dir, folder_name, metadata_file)

    with open(path, "r") as f:
        return json.load(f)
    

organ_meta  = load_metadata("organ_detection", "organ_metadata_v2.json")
bone_meta   = load_metadata("bone_model", "bone_metadata.json")
brain_meta  = load_metadata("brain_model", "brain_metadata.json")
chest_meta  = load_metadata("chest_model", "chest_metadata.json")
dental_meta = load_metadata("dental_model", "dental_metadata.json")
eye_meta    = load_metadata("eye_model", "eye_metadata.json")
knee_meta   = load_metadata("knee_model", "knee_metadata.json")
skin_meta   = load_metadata("skin_model", "skin_metadata.json")

organ_to_disease_model = {
    "Lung_Chest": "chest",
    "Lung_Left": "chest",
    "Lung_Right": "chest",

    "Brain": "brain",

    "Eye_Cornea": "eye",
    "Eye_DR": "eye",
    "Eye_Degeneration": "eye",
    "Eye_Glaucoma": "eye",
    "Eye_Maculopathy": "eye",
    "Eye_Normal": "eye",
    "Eye_OCT": "eye",
    "Eye_Other": "eye",
    "Eye_Vascular": "eye",

    "Skin": "skin",

    "Bone": "bone",
    "Knee": "knee",

    "Teeth": "dental",
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






def _load_model(folder_name, filename, build_fn, num_classes, device):
    path = os.path.join(models_dir, folder_name, filename)
    if not os.path.exists(path):
        logger.warning(f"Model file {filename} not found at {path}. Returning untrained model.")
        return None
    
    try:
        model = build_fn(num_classes)
        state = torch.load(
            path,
            map_location=device,
            weights_only=True
        )
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
            "organ":  organ_meta["classes"],
            "chest":  chest_meta["classes"],
            "brain":  brain_meta["classes"],
            "eye":    eye_meta["classes"],
            "skin":   skin_meta["classes"],
            "bone":   bone_meta["classes"],
            "knee":   knee_meta["classes"],
            "dental": dental_meta["classes"],
        }


     def load_all_models(self):
            """Load all 8 models from models/ directory."""

            self.organ = _load_model(
                "organ_detection",
                "organ_model_v2.pth",
                _organ_resnet50,
                organ_meta["num_classes"],
                self.device
            )

            self.chest = _load_model(
                "chest_model",
                "chest_model.pth",
                _resnet50_v1,
                chest_meta["num_classes"],
                self.device
            )

            self.brain = _load_model(
                "brain_model",
                "brain_model.pth",
                _resnet50_v1,
                brain_meta["num_classes"],
                self.device
            )

            self.skin = _load_model(
                "skin_model",
                "skin_model.pth",
                _skin_resnet50,
                skin_meta["num_classes"],
                self.device
            )

            self.eye = _load_model(
                "eye_model",
                "eye_model.pth",
                _resnet50_v1,
                eye_meta["num_classes"],
                self.device
            )

            self.bone = _load_model(
                "bone_model",
                "bone_model.pth",
                _bone_resnet50,
                bone_meta["num_classes"],
                self.device
            )

            self.knee = _load_model(
                "knee_model",
                "knee_model.pth",
                _resnet50_v1,
                knee_meta["num_classes"],
                self.device
            )

            self.dental = _load_model(
                "dental_model",
                "dental_model.pth",
                _resnet50_v1,
                dental_meta["num_classes"],
                self.device
            )


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
                return names

     def get_disease_model(self, organ_name: str):
                """Returns (key, model, labels) for an organ's disease model."""
                key = organ_to_disease_model.get(organ_name)
                if not key:
                    return None, None, None
                return key, self.get(key), self.labels.get(key, [])

        


registry = ModelRegistry()  
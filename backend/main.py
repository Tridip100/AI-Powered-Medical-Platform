from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import logging 
import os 
import torch 

from .model_loader import registry 
from .image_utils import preprocess_bytes, run_inference, load_image, preprocess_image, image_to_base64
from .gradcam import GradCAM, GradCAMManager
from .symptom_checker import check_symptoms 
from .rag_system import MedicalRAG 


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#---singletone-----------
gradcam_manager = GradCAMManager()
rag = MedicalRAG()


# ===== startup/ Shutdown ======

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("loading all models....")
    registry.load_all_models()
    status = registry.status()
    loaded = sum(status.values())
    logger.info(f" Models loaded : {loaded}/8 - {status}")
    yield
    logger.info("shutting down...")


app = FastAPI(
    title = "Medical AI Platform ",
    description = "Ai powered organ & disease  analysis with explainability and symptom checking",
    version="1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(__file__),"..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")



def require_model(key: str):
    model = registry.get(key)
    if model is None:
        raise HTTPException(status_code=503, detail= f" Model '{key}' is not available. check models/ directory.")
    return model


# ==================================
# Routes
# ====================================

@app.get("/", tags =["System"])
async def root():
    return {"message": " Medical AI platform is running"}


@app.get("/health", tags =["System"])
async def health():
    status = registry.status()
    return{
        "status": "ok",
        "models": status,
        "device": str(registry.device),
        "loaded": sum(status.values()),
        "total": len(status)
    }

# ----- Organ Classifier--------

@app.post("/classify/organ", tags =["Organ Classifier"])
async def classify_organ(file: UploadFile = File(...)):
    """ Classify organ from medical image (14 classes, ResNet50)"""
    model = require_model("organ")
    labels = registry.labels["organ"]
    data = await file.read()
    tensor = preprocess_bytes(data, "organ")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "organ_v2",  **result}

#-------- Disease Model ---------

@app.post("/classify/chest", tags =["Disease Classifier"])
async def classify_chest(file: UploadFile = File(...)):
    """Chest X-ray disease detection(Covid, Pneumonia, TB, Lung Opacity, Normal)."""
    model = require_model("chest")
    labels = registry.labels["chest"]
    data = await file.read()
    tensor = preprocess_bytes(data, "chest")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "chest",  **result}

@app.post("/classify/brain", tags =["Disease Classifier"])
async def classify_brain(file: UploadFile = File(...)):
    """Brain MRI tumor classification (Glioma, Meningioma, No Tumor, Pituitary)."""
    model  = require_model("brain")
    labels = registry.labels["brain"]
    data   = await file.read()
    tensor = preprocess_bytes(data, "brain")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "brain", **result}

@app.post("/classify/eye", tags =["Disease Classifier"])
async def classify_eye(file: UploadFile = File(...)):
    """Eye disease classification (9 classes including Glaucoma, Cataract, DR)."""
    model  = require_model("eye")
    labels = registry.labels["eye"]
    data   = await file.read()
    tensor = preprocess_bytes(data, "eye")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "eye", **result}

@app.post("/classify/skin", tags =["Disease Classifier"])
async def classify_skin(file: UploadFile = File(...)):
    """Skin lesion classification using HAM10000 (7 classes)."""
    model  = require_model("skin")
    labels = registry.labels["skin"]
    data   = await file.read()
    tensor = preprocess_bytes(data, "skin")   # uses HAM10000 normalization
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "skin", **result}

@app.post("/classify/bone", tags =["Disease Classifier"])
async def classify_bone(file: UploadFile = File(...)):
    """Bone fracture detection (Fractured / Normal)."""
    model  = require_model("bone")
    labels = registry.labels["bone"]
    data   = await file.read()
    tensor = preprocess_bytes(data, "bone")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "bone", **result}

@app.post("/classify/knee", tags =["Disease Classifier"])
async def classify_knee(file: UploadFile = File(...)):
    """Knee osteoarthritis grading (Grade 0-4, Kellgren-Lawrence scale)."""
    model  = require_model("knee")
    labels = registry.labels["knee"]
    data   = await file.read()
    tensor = preprocess_bytes(data, "knee")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "knee", **result}

@app.post("/classify/dental", tags =["Disease Classifier"])
async def classify_dental(file: UploadFile = File(...)):
    """Dental condition classification (Caries, Gingivitis, Hypodontia, etc.)."""
    model  = require_model("dental")
    labels = registry.labels["dental"]
    data   = await file.read()
    tensor = preprocess_bytes(data, "dental")
    result = run_inference(model, tensor, labels, registry.device)
    return {"model": "dental", **result}

#-------Auto pipeline Organ -> Disease-----------------

@app.post("/classify/auto", tags =["Disease Classifier"])
async def classify_auto(file: UploadFile = File(...)):
    """
    Auto-pipeline: detect organ first, then run the matching disease model.
    Returns both organ and disease predictions.
    """
    organ_model = require_model("organ")
    data = await file.read()
 
    # Step 1: Organ classification
    organ_tensor = preprocess_bytes(data, "organ")
    organ_result = run_inference(organ_model, organ_tensor, registry.labels["organ"], registry.device)
    organ_name   = organ_result["prediction"]
 
    # Step 2: Disease model lookup
    key, disease_model, disease_labels = registry.get_disease_model_for_organ(organ_name)
 
    if disease_model is None:
        return {
            "organ": organ_result,
            "disease": None,
            "note": f"No disease model mapped for organ: {organ_name}",
        }
 
    disease_tensor = preprocess_bytes(data, key)
    disease_result = run_inference(disease_model, disease_tensor, disease_labels, registry.device)
 
    return {
        "organ": organ_result,
        "disease_model": key,
        "disease": disease_result,
    }


#------- Grad Cam Explainability--------------

@app.post("/explain/gradcam", tags=["Explainability"])
async def explain_gradcam(
    file: UploadFile = File(...),
    model_key: str = Query(default="organ", description=" Model to explain: organ/chest/brain/eye/skin/bone/knee/dental")

):
    """gnerate Grad-Cam heatmap overlaid on the input image"""
    model = require_model(model_key)
    data = await file.read()
    image = load_image(data)
    tensor = preprocess_image(image, model_key)

    arch_map = {
        "organ": "resnet50", "brain": "resnet50", "eye": "resnet50",
        "knee": "resnet50",  "dental": "resnet50", "bone": "resnet50",
        "chest": "densenet", "skin": "efficientnet",
    }
    arch = arch_map.get(model_key, "resnet50")
    

    try:
        gcam    = gradcam_manager.get(model_key, model, arch)
        labels  = registry.labels[model_key]
        result  = gcam.generate_and_encode(tensor.to(registry.device), image)
        pred_label  = labels[result["predicted_class_idx"]]
        confidence  = result["confidence"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grad-CAM failed: {str(e)}")
 
    return {
        "model":            model_key,
        "prediction":       pred_label,
        "confidence":       confidence,
        "overlay_base64":   result["overlay_base64"],
        "heatmap_base64":   result["heatmap_base64"],
    }

#---------- Symptom Checker -----------------------

@app.post("/symptom-check", tags=["Diagonosis"])
async def symptom_check(payload:dict):
    """
    NLP-based symptom checker.
    Body: { "symptoms": ["fever", "cough", "chest pain"] }
    """
    symptoms = payload.get("symptoms", [])
    if not symptoms:
        raise HTTPException(status_code=400, detail="No symptoms provided.")
    result = check_symptoms(symptoms)
    return result 

@app.post("/rag/query", tags=["Education"])
async def rag_query(payload: dict):
    """
    Query the RAG-based medical knowledge base (ChromaDB).
    Body: { "query": "What causes pneumonia?" }
    """
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is empty.")
    answer = rag.tutor_chat(query)
    return {"query": query, "answer": answer.get("answer", ""), "sources": answer.get("sources", [])}


#------------Quiz Mode---------------------

@app.post("/quiz/check", tags=["Education"])
async def quiz_check(
    file: UploadFile = File(...),
    answer: str      = Query(..., description="User's guessed organ/disease label"),
    model_key: str   = Query(default="organ")
):
    """
    Quiz mode: user guesses the organ/disease, we check with the model.
    Returns whether they were correct + actual prediction.
    """
    model  = require_model(model_key)
    labels = registry.labels[model_key]
    data   = await file.read()
    tensor = preprocess_bytes(data, model_key)
    result = run_inference(model, tensor, labels, registry.device)
 
    correct = answer.strip().lower() == result["prediction"].lower()
    return {
        "user_answer": answer,
        "correct": correct,
        "actual": result["prediction"],
        "confidence": result["confidence"],
        "top_k": result["top_k"],
    }
 

#------------- model status------------------

@app.get("/models/status", tags=["System"])
async def model_status():
    """check with models are loaded"""
    return registry.status()

#-------------frontend pages-------------------

@app.get("/app", tags=["Frontend"])
async def serve_app():
    index = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "Frontend not found. Place HTML files in frontend/"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
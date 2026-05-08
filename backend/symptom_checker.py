import json 
import os 
import re 
import math 
import collections
from collections import Counter 

db_path = os.path.join(os.path.dirname(__file__), 'symptom_db.json')



def _load_db() -> list[dict]:
    if not os.path.exists(db_path):
        return []
    with open(db_path, 'r') as f:
        return json.load(f)
    
disease_db = _load_db()


def _tokenize(text: str) -> list[str]:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [ t for t in text.split() if len(t) >2 ]

def _symptom_set(disease : dict) -> set[str]:
    """Flatten all symptom keywords from a disease entry."""
    symptoms = disease.get("symptoms", [])
    tokens = set()
    for s in symptoms:
        tokens.update(_tokenize(s))
    return tokens



def _score_disease(user_tokens: list[str], disease: dict) -> float:
    """
    Score = weighted overlap between user symptoms and disease symptoms.
    Bonus for rare/specific symptoms (lower IDF = more common = less weight).
    """
    disease_tokens = _symptom_set(disease)
    if not disease_tokens:
        return 0.0
    
    user_set = set(user_tokens)
    overlap = user_set & disease_tokens

    if not overlap:
        return 0.0
    
    score = len(overlap) /  len(user_set) + len(disease_tokens) - len(overlap) 

    coverage = len(overlap) / max(len(user_set),1)

    return round(score * coverage/ 2, 4)


def check_symptoms(symptoms: list[str], top_n: int = 5) -> dict:
    """
    Match symptoms against disease DB and return top matches.
 
    Args:
        symptoms: List of symptom strings e.g. ["fever", "dry cough", "fatigue"]
        top_n:    Number of top diseases to return
 
    Returns:
        {
            "input_symptoms": [...],
            "matches": [
                {
                    "disease": "Pneumonia",
                    "score": 0.72,
                    "matched_symptoms": ["fever", "cough"],
                    "all_symptoms": [...],
                    "description": "...",
                    "urgency": "high",
                    "see_doctor": true
                },
                ...
            ],
            "disclaimer": "..."
        }
    """
    if not disease_db:
        return {
            "error": "symptom_db.json not found or empty",
            "input_symptoms": symptoms,
            "matches": [],
        }
    

    user_tokens = []
    for s in symptoms:
        user_tokens.extend(_tokenize(s))
    user_set = set(user_tokens)

    results = []
    for disease in disease_db:
        score = _score_disease(user_tokens, disease)
        if score <= 0:
            continue 

        disease_tokens = _symptom_set(disease)
        matched = [s for s in disease.get("symptoms", [])
                   if user_set & set(_tokenize(s))]
        

        results.append({
            "disease": disease.get("name", "Unknown"),
            "score": score,
            "matched_symptoms": matched,
            "all_symptoms": disease.get("symptoms", []),
            "description": disease.get("description", ""),
            "urgency": disease.get("urgency", "medium"),
            "see_doctor": disease.get("see_doctor", True),
            "organ": disease.get("organ", ""),
        })

        results.sort(key=lambda x: x["score"], reverse=True)
        top = results[:top_n]
    
        return {
            "input_symptoms": symptoms,
            "matches": top,
            "total_matched": len(results),
            "disclaimer": (
                "This tool is for educational purposes only. "
                "It does not replace professional medical advice. "
                "Please consult a qualified doctor for diagnosis."
            ),
        }
    


async def  check_symptoms_with_mistralai(description: str) -> dict:
    """
    Use Claude API to extract structured symptoms from a natural language
    description, then run check_symptoms on the result.
    """
    import httpx
 
    prompt = f"""
A patient described their symptoms as:
"{description}"
 
Extract a list of individual medical symptoms from this description.
Reply ONLY with a JSON array of symptom strings, e.g.:
["fever", "dry cough", "shortness of breath", "fatigue"]
No explanation. No markdown. Just the JSON array.
"""
    
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
        data = resp.json()
        raw  = data["content"][0]["text"].strip()
        # Strip markdown fences if present
        raw  = re.sub(r"```json|```", "", raw).strip()
        extracted = json.loads(raw)
        if isinstance(extracted, list):
            return check_symptoms(extracted)
    except Exception as e:
        pass
 
    # Fallback: treat whole description as one symptom string
    return check_symptoms([description])
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class PredictWaitRequest(BaseModel):
    clinicId: str
    currentToken: int
    yourToken: int


class PredictWaitResponse(BaseModel):
    etaMinutes: int
    peopleAhead: int
    confidence: float


@app.post("/api/ai/predict-wait")
def predict_wait(payload: PredictWaitRequest) -> PredictWaitResponse:
    people_ahead = payload.yourToken - payload.currentToken
    eta_minutes = people_ahead * 7

    return PredictWaitResponse(
        etaMinutes=eta_minutes,
        peopleAhead=people_ahead,
        confidence=0.9
    )


class VerifyEmergencyRequest(BaseModel):
    type: str
    description: str


class VerifyEmergencyResponse(BaseModel):
    isRealEmergency: bool
    urgencyScore: float
    reason: str


@app.post("/api/ai/verify-emergency")
def verify_emergency(payload: VerifyEmergencyRequest) -> VerifyEmergencyResponse:
    keywords = ["chest pain", "bleeding", "breathing"]
    text = (payload.type + " " + payload.description).lower()

    keyword_found = any(word in text for word in keywords)
    long_enough = len(payload.description) > 20

    is_real = keyword_found and long_enough

    if is_real:
        reason = "Description mentions a high-risk symptom and gives enough detail"
        urgency_score = 0.9
    else:
        reason = "No high-risk keywords found, or description too short"
        urgency_score = 0.3

    return VerifyEmergencyResponse(
        isRealEmergency=is_real,
        urgencyScore=urgency_score,
        reason=reason
    )
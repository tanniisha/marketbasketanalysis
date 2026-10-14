from pydantic import BaseModel

class AnalysisConfig(BaseModel):
    min_support: float = 0.05
    min_confidence: float = 0.2
    min_lift: float = 1.0

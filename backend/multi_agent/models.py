from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class SourceType(Enum):
    DB = "db"
    OLLAMA = "ollama"
    GOOGLE = "google"

@dataclass
class SourceAnswer:
    source: SourceType
    answer: str
    confidence: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    judge_score: Optional[int] = None

@dataclass 
class JudgeEvaluation:
    score: int  # 1-10
    criteria_scores: Dict[str, int]  # accuracy, completeness, currency, relevance, safety
    issues: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    needs_research: bool = False
    research_instructions: Dict[str, str] = field(default_factory=dict)

@dataclass
class FinalOutput:
    final_answer: str
    iteration_history: List[Dict]
    judge_evaluation: Dict
    constraint_check: Dict
    sources_used: List[str]
    confidence: str  # "high", "medium", "low"
    timestamp: str

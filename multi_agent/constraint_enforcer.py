import re
from typing import Tuple, List, Dict, Any

class ConstraintEnforcer:
    """
    Hard rules that CANNOT be violated
    Prevents dangerous or inaccurate outputs
    """
    
    CONSTRAINTS = {
        "max_fine_helmet": 1000,  # Cannot exceed this
        "mandatory_sections": ["Section 129", "MV Act"],
        "forbidden_phrases": [
            "you can ignore",
            "not necessary",
            "optional",
            "police won't catch",
            "it's okay"
        ],
        "required_phrases": ["fine", "mandatory", "penalty"]
    }
    
    def validate(
        self, 
        answer: str, 
        user_question: str
    ) -> Tuple[bool, List[str], str]:
        """
        Validate answer against hard constraints
        Returns: (is_valid, list_of_violations, corrected_draft_if_any)
        """
        violations = []
        
        # Check forbidden phrases
        for phrase in self.CONSTRAINTS["forbidden_phrases"]:
            if phrase.lower() in answer.lower():
                violations.append(f'FORBIDDEN PHRASE: "{phrase}"')
        
        # Fine amount validation (regex extract and compare)
        fines = re.findall(r'₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*', answer)
        for fine in fines:
            fine_int = int(fine.replace(',', ''))
            if fine_int > self.CONSTRAINTS["max_fine_helmet"]:
                # Basic check - if query mentions helmet, ensure fine is not > 1000
                if "helmet" in user_question.lower():
                    violations.append(f'FINE EXCEEDS MAX (Helmet): ₹{fine}')
        
        is_valid = len(violations) == 0
        return is_valid, violations, answer
    
    def auto_fix(
        self, 
        draft: str, 
        user_question: str, 
        violations: List[str]
    ) -> str:
        """Attempt automatic fixes for common violations"""
        
        fixed = draft
        
        for violation in violations:
            if "FORBIDDEN PHRASE" in violation:
                # Remove or replace forbidden phrases
                phrase = violation.split('"')[1]
                # Regex replace with case insensitivity
                fixed = re.sub(re.escape(phrase), "[removed]", fixed, flags=re.IGNORECASE)
            
            elif "FINE EXCEEDS MAX" in violation:
                # Replace excessive fines with max allowed
                fine_match = re.search(r'₹?[\s]*([\d,]+)', violation)
                if fine_match:
                    bad_fine = fine_match.group(1)
                    fixed = fixed.replace(bad_fine, "1,000")
                    if "(Note: Fine capped at legal maximum)" not in fixed:
                        fixed += "\n*(Note: Fine capped at legal maximum)*"
        
        return fixed

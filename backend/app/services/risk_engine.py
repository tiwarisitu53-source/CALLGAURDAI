from typing import Dict, Any, List
import json
import os
import re

class RiskEngine:
    """
    CallGuard conversational risk engine.
    Evaluates conversational signals and intent across multi-turn transcripts.
    """

    CONVERSATIONAL_SIGNALS = [
        "Financial requests",
        "OTP/password/PIN requests",
        "Requests for sensitive information",
        "Urgency",
        "Threats",
        "Impersonation",
        "Suspicious links",
        "Requests to install software",
        "Requests to keep information secret",
        "Unusual payment requests",
        "Contradictory explanations",
        "Normal business/project/service context",
    ]

    def evaluate(self, caller_text: str, conversation_history: List[Dict[str, str]], caller_number: str) -> Dict[str, Any]:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                prompt = f"""You are CallGuard AI's core risk analysis engine.
Incoming caller number: {caller_number}

Evaluate the following conversation transcript:
History:
{json.dumps(conversation_history, indent=2)}

Latest caller utterance:
"{caller_text}"

Signals to evaluate:
{json.dumps(self.CONVERSATIONAL_SIGNALS, indent=2)}

Return strict JSON with this schema:
{{
  "risk_score": <int 0-100>,
  "risk_level": "<LOW | MEDIUM | HIGH>",
  "intent": "<string>",
  "scam_category": "<string>",
  "signals": [<array of matched signals from list above>],
  "explanation": "<string>",
  "recommended_action": "<CONNECT | SCREEN_FURTHER | BLOCK>",
  "next_question": "<string if SCREEN_FURTHER>",
  "closing_statement": "<string if CONNECT or BLOCK>"
}}
"""
                resp = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                if resp.text:
                    return json.loads(resp.text)
            except Exception as e:
                print(f"RiskEngine LLM fallback: {e}")

        # Rule-based fallback
        lower = caller_text.lower()
        signals = []
        score = 20
        category = "General Inquiry"
        intent = "Standard Communication"
        action = "SCREEN_FURTHER"
        explanation = "Preliminary conversational screening."
        next_q = "Could you please state the exact purpose of your call and your organization?"
        closing = ""

        if any(w in lower for w in ["otp", "verification code", "pin", "password", "6-digit"]):
            signals.extend(["OTP/password/PIN requests", "Requests for sensitive information"])
            score += 60

        if any(w in lower for w in ["bank", "fraud department", "security team", "account blocked"]):
            signals.extend(["Impersonation", "Financial requests"])
            score += 35
            category = "Financial Scam"
            intent = "Bank Impersonation Verification"

        if any(w in lower for w in ["urgent", "immediately", "frozen", "suspend", "arrest"]):
            signals.append("Urgency")
            score += 25

        if any(w in lower for w in ["won", "prize", "lottery", "cash reward"]):
            signals.extend(["Prize scam", "Financial requests"])
            score += 45
            category = "Prize Scam"
            intent = "Prize Claim Solicitation"

        if any(w in lower for w in ["project", "presentation", "colleague", "meeting", "sync", "rahul"]):
            signals.append("Normal business/project/service context")
            score = max(5, score - 30)
            category = "None (Legitimate Context)"
            intent = "Project Team Discussion"

        score = min(100, score)
        level = "HIGH" if score >= 70 else "MEDIUM" if score >= 35 else "LOW"

        if "OTP/password/PIN requests" in signals or score >= 90:
            action = "BLOCK"
            explanation = "Caller attempted to solicit confidential authentication credentials."
            closing = "CallGuard security policy prohibits sharing verification codes. Terminating call."
        elif "Normal business/project/service context" in signals and score < 30:
            action = "CONNECT"
            explanation = "Legitimate business context confirmed with no risk signals."
            closing = "Thank you. Connecting your call now."
        elif category in ["Financial Scam", "Prize Scam"]:
            action = "BLOCK" if score >= 85 else "SCREEN_FURTHER"
            explanation = f"Detected suspicious {category} indicators requiring verification."
            next_q = "Which branch are you calling from, and what is your verified employee ID?"

        return {
            "risk_score": score,
            "risk_level": level,
            "intent": intent,
            "scam_category": category,
            "signals": signals,
            "explanation": explanation,
            "recommended_action": action,
            "next_question": next_q,
            "closing_statement": closing,
        }

risk_engine = RiskEngine()

from typing import List, Dict, Any
from .risk_engine import risk_engine

class ConversationService:
    """
    Adaptive screening conversation engine.
    Follows non-scripted, intent-aware dialogue loops.
    """
    def process_turn(
        self,
        caller_utterance: str,
        transcript_history: List[Dict[str, Any]],
        caller_number: str
    ) -> Dict[str, Any]:
        analysis = risk_engine.evaluate(
            caller_text=caller_utterance,
            conversation_history=transcript_history,
            caller_number=caller_number
        )

        action = analysis.get("recommended_action", "SCREEN_FURTHER")
        next_question = analysis.get("next_question")
        closing_statement = analysis.get("closing_statement")

        if action == "CONNECT":
            response_text = closing_statement or "Thank you. Connecting your call now."
        elif action == "BLOCK":
            response_text = closing_statement or "CallGuard has flagged this call as high risk. Goodbye."
        else:
            response_text = next_question or "Could you clarify the exact details and purpose of your inquiry?"

        return {
            "analysis": analysis,
            "assistant_response": response_text,
            "recommended_action": action
        }

conversation_service = ConversationService()

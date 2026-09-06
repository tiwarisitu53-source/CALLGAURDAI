from typing import Dict, Any
from .reputation_service import reputation_service
from .conversation_service import conversation_service

class CallScreeningService:
    """
    Two-layer screening coordinator:
    Layer 1: Fast reputation check (<500ms)
    Layer 2: Adaptive conversational LLM screening
    """
    def screen_incoming_number(self, phone_number: str) -> Dict[str, Any]:
        reputation = reputation_service.evaluate(phone_number)
        if reputation.get("is_spam"):
            return {
                "layer": "LAYER_1",
                "action": "BLOCK",
                "reason": f"Flagged by {reputation.get('provider')} as {reputation.get('category')}",
                "reputation": reputation
            }

        return {
            "layer": "LAYER_2",
            "action": "SCREEN_CONVERSATION",
            "reason": "Safe/Unknown caller reputation. AI conversation initialized.",
            "reputation": reputation
        }

call_screening_service = CallScreeningService()

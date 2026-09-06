from typing import Dict, Any

class CallRoutingService:
    """
    Handles call bridging, forwarding, or termination actions in telephony platforms.
    """
    def route_call(self, call_id: str, action: str, destination_number: str = "") -> Dict[str, Any]:
        if action == "CONNECT":
            return {
                "status": "routed",
                "action": "CONNECT",
                "destination": destination_number or "User Direct Extension",
                "message": "Call successfully forwarded to recipient."
            }
        elif action == "BLOCK":
            return {
                "status": "terminated",
                "action": "BLOCK",
                "message": "Call blocked and disconnected."
            }
        else:
            return {
                "status": "holding",
                "action": "SCREEN_FURTHER",
                "message": "Call in active screening loop."
            }

call_routing_service = CallRoutingService()

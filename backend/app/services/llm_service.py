import os
from typing import Optional

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    def generate_response(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=f"{system_prompt}\n\n{user_prompt}"
            )
            return response.text
        except Exception as e:
            print(f"LLMService error: {e}")
            return None

llm_service = LLMService()

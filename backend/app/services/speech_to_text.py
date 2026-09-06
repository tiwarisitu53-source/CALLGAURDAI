import os
from typing import Optional, Dict, Any

class SpeechToTextService:
    """
    Converts caller speech audio stream/data to text transcript.
    Ephemeral processing: does not store raw audio by default.
    """
    def transcribe(self, audio_data: bytes, mime_type: str = "audio/wav") -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                import base64
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=api_key)
                b64 = base64.b64encode(audio_data).decode("utf-8")
                response = client.models.generate_content(
                    model="gemini-3.5-transcribe",
                    contents=[
                        types.Part.from_bytes(data=audio_data, mime_type=mime_type),
                        "Transcribe the spoken audio verbatim without commentary."
                    ]
                )
                return response.text.strip() if response.text else ""
            except Exception as e:
                print(f"STT transcription error: {e}")

        return ""

speech_to_text_service = SpeechToTextService()

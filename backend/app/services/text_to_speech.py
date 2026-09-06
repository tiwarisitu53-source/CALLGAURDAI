import os
from typing import Optional, Dict, Any

class TextToSpeechService:
    """
    Synthesizes speech using generic natural-sounding voice models.
    Does NOT clone or impersonate any real person's voice.
    """
    def __init__(self):
        self.default_voice = "Zephyr"  # Generic natural voice

    def synthesize(self, text: str, voice_name: Optional[str] = None) -> Dict[str, Any]:
        voice = voice_name or self.default_voice
        api_key = os.getenv("GEMINI_API_KEY")

        if api_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-3.1-flash-tts-preview",
                    contents=f"Say clearly and professionally: {text}",
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                            )
                        )
                    )
                )
                audio_part = response.candidates[0].content.parts[0]
                if audio_part.inline_data:
                    return {
                        "status": "success",
                        "audio_base64": audio_part.inline_data.data,
                        "voice": voice,
                        "is_generic_voice": True,
                        "person_cloned": False
                    }
            except Exception as e:
                print(f"TTS synthesis fallback: {e}")

        return {
            "status": "fallback",
            "text": text,
            "voice": voice,
            "is_generic_voice": True,
            "person_cloned": False
        }

text_to_speech_service = TextToSpeechService()

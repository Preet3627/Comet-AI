from fastapi import HTTPException
from anthropic import APIError as AnthropicAPIError
from openai import APIError as OpenAIAPIError
from google.genai.errors import APIError as GoogleAPIError
import traceback


def handle_llm_client_exceptions(e: Exception) -> HTTPException:
    traceback.print_exc()
    if isinstance(e, OpenAIAPIError):
        return HTTPException(status_code=500, detail=f"OpenAI API error: {e.message}")
    if isinstance(e, GoogleAPIError):
        return HTTPException(status_code=500, detail=f"Google API error: {e.message}")
    if isinstance(e, AnthropicAPIError):
        return HTTPException(
            status_code=500, detail=f"Anthropic API error: {e.message}"
        )
    return HTTPException(status_code=500, detail=f"LLM API error: {e}")

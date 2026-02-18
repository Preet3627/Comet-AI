from typing import Any, Callable, Coroutine, Optional
from pydantic import BaseModel, Field


class LLMTool(BaseModel):
    pass


class LLMDynamicTool(LLMTool):
    name: str
    description: str
    parameters: dict = {}
    handler: Callable[..., Coroutine[Any, Any, str]]


class SearchWebTool(LLMTool):
    """
    Search the web for information.
    """

    query: str = Field(description="The query to search the web for")


class GetCurrentDatetimeTool(LLMTool):
    """
    Get the current datetime.
    """

    pass

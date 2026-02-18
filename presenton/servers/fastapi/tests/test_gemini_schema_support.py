import json
from typing import Optional
from pydantic import BaseModel, Field
from google.genai.types import GenerateContentResponse, GenerateContentConfig


from utils.llm_provider import get_google_llm_client, get_large_model


class HeadingDescription(BaseModel):
    heading: str = Field(
        description="Heading of the slide", min_length=10, max_length=20
    )
    description: str = Field(
        description="Description of the slide", min_length=40, max_length=200
    )


class SlideContentTest(BaseModel):
    title: str = Field(description="Title of the slide", min_length=10, max_length=20)
    first_content: HeadingDescription = Field(description="First content of the slide")
    second_content: HeadingDescription = Field(
        description="Second content of the slide"
    )
    third_content: HeadingDescription = Field(description="Third content of the slide")


class ColumnContentModel(BaseModel):
    title: str = Field(min_length=3, max_length=100, description="Column title")
    content: str = Field(min_length=10, max_length=800, description="Column content")


class TwoColumnSlideModel(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=100,
        description="Title of the slide",
    )
    subtitle: Optional[str] = Field(
        min_length=3,
        max_length=150,
        description="Optional subtitle or description",
    )
    leftColumn: ColumnContentModel = Field(
        description="Left column content",
    )
    rightColumn: ColumnContentModel = Field(
        description="Right column content",
    )
    backgroundImage: Optional[str] = Field(
        description="URL to background image for the slide"
    )


def test_gemini_schema_support():
    response: GenerateContentResponse = get_google_llm_client().models.generate_content(
        model=get_large_model(),
        contents=[
            "Generate a slide for a presentation",
            "The slide should have a title and two contents",
            "The title should be a short title for the slide",
            "The contents should be a heading and a description",
            "The heading should be a short heading for the slide",
        ],
        config=GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TwoColumnSlideModel.model_json_schema(),
        ),
    )
    print(response.text)

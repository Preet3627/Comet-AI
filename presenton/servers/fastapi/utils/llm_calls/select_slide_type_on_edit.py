from models.llm_message import LLMSystemMessage, LLMUserMessage
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.slide_layout_index import SlideLayoutIndex
from models.sql.slide import SlideModel
from services.llm_client import LLMClient
from utils.llm_client_error_handler import handle_llm_client_exceptions
from utils.llm_provider import get_model


def get_messages(
    prompt: str,
    slide_data: dict,
    layout: PresentationLayoutModel,
    current_slide_layout: int,
):
    return [
        LLMSystemMessage(
            content=f"""
                Select a Slide Layout index based on provided user prompt and current slide data.
                {layout.to_string()}

                # Notes
                - Do not select different slide layout than current unless absolutely necessary as per user prompt. 
                - If user prompt is not clear, select the layout that is most relevant to the slide data.
                - If user prompt is not clear, select the layout that is most relevant to the slide data.
                **Go through all notes and steps and make sure they are followed, including mentioned constraints**
            """,
        ),
        LLMUserMessage(
            content=f"""
                - User Prompt: {prompt}
                - Current Slide Data: {slide_data}
                - Current Slide Layout: {current_slide_layout}
            """,
        ),
    ]


async def get_slide_layout_from_prompt(
    prompt: str,
    layout: PresentationLayoutModel,
    slide: SlideModel,
) -> SlideLayoutModel:

    client = LLMClient()
    model = get_model()

    slide_layout_index = layout.get_slide_layout_index(slide.layout)

    try:
        response = await client.generate_structured(
            model=model,
            messages=get_messages(
                prompt,
                slide.content,
                layout,
                slide_layout_index,
            ),
            response_format=SlideLayoutIndex.model_json_schema(),
            strict=True,
        )
        index = SlideLayoutIndex(**response).index
        return layout.slides[index]

    except Exception as e:
        raise handle_llm_client_exceptions(e)

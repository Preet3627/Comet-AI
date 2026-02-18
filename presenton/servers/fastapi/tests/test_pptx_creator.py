import asyncio
from models.pptx_models import (
    PptxAutoShapeBoxModel,
    PptxFillModel,
    PptxPositionModel,
    PptxPresentationModel,
    PptxSlideModel,
)
from services.pptx_presentation_creator import PptxPresentationCreator
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE


pptx_model = PptxPresentationModel(
    slides=[
        PptxSlideModel(
            shapes=[
                PptxAutoShapeBoxModel(
                    type=MSO_AUTO_SHAPE_TYPE.RECTANGLE,
                    position=PptxPositionModel(
                        left=20,
                        right=20,
                        width=100,
                        height=100,
                    ),
                    fill=PptxFillModel(
                        color="000000",
                        opacity=0.5,
                    ),
                )
            ]
        )
    ]
)


def test_pptx_creator():
    temp_dir = "/tmp/presenton"
    pptx_creator = PptxPresentationCreator(pptx_model, temp_dir)
    asyncio.run(pptx_creator.create_ppt())
    pptx_creator.save("debug/test.pptx")

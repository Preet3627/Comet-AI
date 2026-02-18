from datetime import datetime
from typing import Optional, List
import uuid
from sqlalchemy import Column, DateTime, Text, JSON
from sqlmodel import SQLModel, Field

from utils.datetime_utils import get_current_utc_datetime


class PresentationLayoutCodeModel(SQLModel, table=True):
    """Model for storing presentation layout codes"""

    __tablename__ = "presentation_layout_codes"

    id: Optional[int] = Field(default=None, primary_key=True)
    presentation: uuid.UUID = Field(index=True, description="UUID of the presentation")
    layout_id: str = Field(description="Unique identifier for the layout")
    layout_name: str = Field(description="Display name of the layout")
    layout_code: str = Field(
        sa_column=Column(Text), description="TSX/React component code for the layout"
    )
    fonts: Optional[List[str]] = Field(
        sa_column=Column(JSON), default=None, description="Optional list of font links"
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=get_current_utc_datetime,
            onupdate=get_current_utc_datetime,
        ),
    )

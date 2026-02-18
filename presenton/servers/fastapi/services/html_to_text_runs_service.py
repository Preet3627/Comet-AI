from html.parser import HTMLParser
from typing import List, Optional

from models.pptx_models import PptxFontModel, PptxTextRunModel


class InlineHTMLToRunsParser(HTMLParser):
    def __init__(self, base_font: PptxFontModel):
        super().__init__(convert_charrefs=True)
        self.base_font = base_font
        self.tag_stack: List[str] = []
        self.text_runs: List[PptxTextRunModel] = []

    def _current_font(self) -> PptxFontModel:
        font_json = self.base_font.model_dump()
        is_bold = any(tag in ("strong", "b") for tag in self.tag_stack)
        is_italic = any(tag in ("em", "i") for tag in self.tag_stack)
        is_underline = any(tag == "u" for tag in self.tag_stack)
        is_strike = any(tag in ("s", "strike", "del") for tag in self.tag_stack)
        is_code = any(tag == "code" for tag in self.tag_stack)

        if is_bold:
            font_json["font_weight"] = 700
        if is_italic:
            font_json["italic"] = True
        if is_underline:
            font_json["underline"] = True
        if is_strike:
            font_json["strike"] = True
        if is_code:
            font_json["name"] = "Courier New"

        return PptxFontModel(**font_json)

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "br":
            self.text_runs.append(PptxTextRunModel(text="\n"))
            return
        self.tag_stack.append(tag)

    def handle_endtag(self, tag):
        tag = tag.lower()
        for i in range(len(self.tag_stack) - 1, -1, -1):
            if self.tag_stack[i] == tag:
                del self.tag_stack[i]
                break

    def handle_data(self, data):
        if data == "":
            return
        self.text_runs.append(PptxTextRunModel(text=data, font=self._current_font()))


def parse_html_text_to_text_runs(
    text: str, base_font: Optional[PptxFontModel] = None
) -> List[PptxTextRunModel]:
    normalized_text = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized_text = normalized_text.replace("\n", "<br>")

    parser = InlineHTMLToRunsParser(base_font if base_font else PptxFontModel())
    parser.feed(normalized_text)
    return parser.text_runs



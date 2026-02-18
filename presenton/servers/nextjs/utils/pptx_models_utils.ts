import { ElementAttributes, SlideAttributesResult } from "@/types/element_attibutes";
import {
  PptxSlideModel,
  PptxTextBoxModel,
  PptxAutoShapeBoxModel,
  PptxPictureBoxModel,
  PptxConnectorModel,
  PptxPositionModel,
  PptxFillModel,
  PptxStrokeModel,
  PptxShadowModel,
  PptxFontModel,
  PptxParagraphModel,
  PptxPictureModel,
  PptxObjectFitModel,
  PptxBoxShapeEnum,
  PptxObjectFitEnum,
  PptxAlignment,
  PptxShapeType,
  PptxConnectorType
} from "@/types/pptx_models";

function convertTextAlignToPptxAlignment(textAlign?: string): PptxAlignment | undefined {
  if (!textAlign) return undefined;

  switch (textAlign.toLowerCase()) {
    case 'left':
      return PptxAlignment.LEFT;
    case 'center':
      return PptxAlignment.CENTER;
    case 'right':
      return PptxAlignment.RIGHT;
    case 'justify':
      return PptxAlignment.JUSTIFY;
    default:
      return PptxAlignment.LEFT;
  }
}

function convertLineHeightToRelative(lineHeight?: number, fontSize?: number): number | undefined {
  if (!lineHeight) return undefined;

  let calculatedLineHeight = 1.2;
  if (lineHeight < 10) {
    calculatedLineHeight = lineHeight;
  }

  if (fontSize && fontSize > 0) {
    calculatedLineHeight = Math.round((lineHeight / fontSize) * 100) / 100;
  }

  return calculatedLineHeight - 0.3
}

export function convertElementAttributesToPptxSlides(
  slidesAttributes: SlideAttributesResult[]
): PptxSlideModel[] {
  return slidesAttributes.map((slideAttributes) => {
    const shapes = slideAttributes.elements.map(element => {
      return convertElementToPptxShape(element);
    }).filter(Boolean);

    const slide: PptxSlideModel = {
      shapes: shapes as (PptxTextBoxModel | PptxAutoShapeBoxModel | PptxConnectorModel | PptxPictureBoxModel)[],
      note: slideAttributes.speakerNote
    };

    if (slideAttributes.backgroundColor) {
      slide.background = {
        color: slideAttributes.backgroundColor,
        opacity: 1.0
      };
    }

    return slide;
  });
}

function convertElementToPptxShape(
  element: ElementAttributes
): PptxTextBoxModel | PptxAutoShapeBoxModel | PptxConnectorModel | PptxPictureBoxModel | null {

  if (!element.position) {
    return null;
  }

  if (element.tagName === 'img' || (element.className && typeof element.className === 'string' && element.className.includes('image')) || element.imageSrc) {
    return convertToPictureBox(element);
  }

  if (element.innerText && element.innerText.trim().length > 0) {
    // Use AutoShape model if there's background color and border radius
    if (element.background?.color && element.borderRadius && element.borderRadius.some(radius => radius > 0)) {
      return convertToAutoShapeBox(element);
    }
    return convertToTextBox(element);
  }

  if (element.tagName === 'hr') {
    return convertToConnector(element);
  }

  return convertToAutoShapeBox(element);
}

function convertToTextBox(element: ElementAttributes): PptxTextBoxModel {
  const position: PptxPositionModel = {
    left: Math.round(element.position?.left ?? 0),
    top: Math.round(element.position?.top ?? 0),
    width: Math.round(element.position?.width ?? 0),
    height: Math.round(element.position?.height ?? 0)
  };

  const fill: PptxFillModel | undefined = element.background?.color ? {
    color: element.background.color,
    opacity: element.background.opacity ?? 1.0
  } : undefined;

  const font: PptxFontModel | undefined = element.font ? {
    name: element.font.name ?? "Inter",
    size: Math.round(element.font.size ?? 16),
    font_weight: element.font.weight ?? 400,
    italic: element.font.italic ?? false,
    color: element.font.color ?? "000000"
  } : undefined;

  const paragraph: PptxParagraphModel = {
    spacing: undefined,
    alignment: convertTextAlignToPptxAlignment(element.textAlign),
    font,
    line_height: convertLineHeightToRelative(element.lineHeight, element.font?.size),
    text: element.innerText
  };

  return {
    shape_type: "textbox",
    margin: undefined,
    fill,
    position,
    text_wrap: element.textWrap ?? true,
    paragraphs: [paragraph]
  };
}

function convertToAutoShapeBox(element: ElementAttributes): PptxAutoShapeBoxModel {
  const position: PptxPositionModel = {
    left: Math.round(element.position?.left ?? 0),
    top: Math.round(element.position?.top ?? 0),
    width: Math.round(element.position?.width ?? 0),
    height: Math.round(element.position?.height ?? 0)
  };
  const fill: PptxFillModel | undefined = element.background?.color ? {
    color: element.background.color,
    opacity: element.background.opacity ?? 1.0
  } : undefined;

  const stroke: PptxStrokeModel | undefined = element.border?.color ? {
    color: element.border.color,
    thickness: element.border.width ?? 1,
    opacity: element.border.opacity ?? 1.0
  } : undefined;

  const shadow: PptxShadowModel | undefined = element.shadow?.color ? {
    radius: Math.round(element.shadow.radius ?? 4),
    offset: Math.round(element.shadow.offset ? Math.sqrt(element.shadow.offset[0] ** 2 + element.shadow.offset[1] ** 2) : 0),
    color: element.shadow.color,
    opacity: element.shadow.opacity ?? 0.5,
    angle: Math.round(element.shadow.angle ?? 0)
  } : undefined;

  const paragraphs: PptxParagraphModel[] | undefined = element.innerText ? [{
    spacing: undefined,
    alignment: convertTextAlignToPptxAlignment(element.textAlign),
    font: element.font ? {
      name: element.font.name ?? "Inter",
      size: Math.round(element.font.size ?? 16),
      font_weight: element.font.weight ?? 400,
      italic: element.font.italic ?? false,
      color: element.font.color ?? "000000"
    } : undefined,
    line_height: convertLineHeightToRelative(element.lineHeight, element.font?.size),
    text: element.innerText
  }] : undefined;

  const shapeType = element.borderRadius ? PptxShapeType.ROUNDED_RECTANGLE : PptxShapeType.RECTANGLE;

  let borderRadius = undefined;
  for (const eachCornerRadius of element.borderRadius ?? []) {
    if (eachCornerRadius > 0) {
      borderRadius = Math.max(borderRadius ?? 0, eachCornerRadius);
    }
  }

  return {
    shape_type: "autoshape",
    type: shapeType,
    margin: undefined,
    fill,
    stroke,
    shadow,
    position,
    text_wrap: element.textWrap ?? true,
    border_radius: borderRadius || undefined,
    paragraphs
  };
}

function convertToPictureBox(element: ElementAttributes): PptxPictureBoxModel {
  const position: PptxPositionModel = {
    left: Math.round(element.position?.left ?? 0),
    top: Math.round(element.position?.top ?? 0),
    width: Math.round(element.position?.width ?? 0),
    height: Math.round(element.position?.height ?? 0)
  };

  const objectFit: PptxObjectFitModel = {
    fit: element.objectFit ? (element.objectFit as PptxObjectFitEnum) : PptxObjectFitEnum.CONTAIN
  };

  const picture: PptxPictureModel = {
    is_network: element.imageSrc ? element.imageSrc.startsWith('http') : false,
    path: element.imageSrc || ''
  };

  return {
    shape_type: "picture",
    position,
    margin: undefined,
    clip: element.clip ?? true,
    invert: element.filters?.invert === 1,
    opacity: element.opacity,
    border_radius: element.borderRadius ? element.borderRadius.map(r => Math.round(r)) : undefined,
    shape: element.shape ? (element.shape as PptxBoxShapeEnum) : PptxBoxShapeEnum.RECTANGLE,
    object_fit: objectFit,
    picture
  };
}

function convertToConnector(element: ElementAttributes): PptxConnectorModel {
  const position: PptxPositionModel = {
    left: Math.round(element.position?.left ?? 0),
    top: Math.round(element.position?.top ?? 0),
    width: Math.round(element.position?.width ?? 0),
    height: Math.round(element.position?.height ?? 0)
  };

  return {
    shape_type: "connector",
    type: PptxConnectorType.STRAIGHT,
    position,
    thickness: element.border?.width ?? 0.5,
    color: element.border?.color || element.background?.color || '000000',
    opacity: element.border?.opacity ?? 1.0
  };
}

'use client'

import React, { memo } from "react";

const SlideContent = memo(({ slide }: { slide: any }) => {
  const cleanHtml = slide.html
    .replace(/```html/g, "")
    .replace(/```/g, "")
    .replace(/<html>/g, "")
    .replace(/<\/html>/g, "")
    .replace(/html/g, "");
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: cleanHtml,
      }}
    />
  );
});

export default SlideContent;

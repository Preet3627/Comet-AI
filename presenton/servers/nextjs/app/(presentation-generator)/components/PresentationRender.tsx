import React, { useEffect, useMemo, useRef, useState } from 'react'

import { V1ContentRender } from '../../(presentation-generator)/components/V1ContentRender';


const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

const SlideScale = ({ slide }: { slide: any }) => {

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    const scale = useMemo(() => {
        // Slight padding to avoid overflow due to borders/scrollbars
        const safeWidth = Math.max(0, containerWidth + 20);
        if (!safeWidth) return 1;
        return Math.min((safeWidth / BASE_WIDTH) * 0.98, 1);
    }, [containerWidth]);

    useEffect(() => {
        if (!containerRef.current) return;

        const el = containerRef.current;
        const ro = new ResizeObserver(() => {
            // Use clientWidth so we match the actual available column width
            setContainerWidth(el.clientWidth);
        });

        ro.observe(el);
        // Initial measure
        setContainerWidth(el.clientWidth);

        return () => ro.disconnect();
    }, []);
    return (<div
        ref={containerRef}
        className="relative w-full  shadow-md"
    >
        <div
            className="relative mx-auto max-w-[1280px] "
            style={{ height: `${BASE_HEIGHT * scale}px`, overflow: "hidden" }}
        >
            <div
                className="absolute top-0 left-0"
                style={{
                    width: BASE_WIDTH,
                    height: BASE_HEIGHT,
                    transformOrigin: "top left",
                    transform: `scale(${scale})`,
                }}
            >

                <div
                    className="relative w-full h-full  select-none"
                    data-testid="slide-content"
                    style={{
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        MozUserSelect: "none",
                        msUserSelect: "none",
                    } as React.CSSProperties}
                >

                    <div
                        className="absolute inset-0 bg-transparent z-30 w-full h-full  select-none"
                        aria-hidden="true"

                    />
                    <V1ContentRender slide={slide} isEditMode={true} />
                </div>


            </div>
        </div>
    </div>
    )
}

export default SlideScale
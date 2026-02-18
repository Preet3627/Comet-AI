import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Slide } from '../../types/slide';
import { useRef } from 'react';
import { V1ContentRender } from '../../components/V1ContentRender';
import { useSearchParams } from 'next/navigation';
interface SortableSlideProps {
    slide: Slide;
    index: number;
    selectedSlide: number;
    onSlideClick: (index: any) => void;
}
const SCALE = 0.2;

export function SortableSlide({ slide, index, selectedSlide, onSlideClick }: SortableSlideProps) {
    const searchParams = useSearchParams();
    const type = searchParams.get("type") as 'standard' | 'smart';
    const lastClickTime = useRef(0);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: slide.id || `${slide.index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: `var(--card-color, #ffffff)`,
        borderColor: selectedSlide === index ? `#5141e5` : `var(--stroke, #e5e7eb)`
    };

    const handleClick = (e: React.MouseEvent) => {
        const now = Date.now();

        // Debounce clicks - only allow one click every 300ms
        if (now - lastClickTime.current < 300) {
            return;
        }

        // Only trigger click if not dragging
        if (!isDragging) {
            lastClickTime.current = now;
            onSlideClick(slide.index);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={` cursor-pointer border-[3px] relative  p-1 shadow-lg   rounded-md transition-all duration-200 ${selectedSlide === index ? ' border-[#5141e5]' : 'border-gray-300'
                }`}
        >

            <div
                className="relative"
                style={{ height: `${720 * SCALE}px`, overflow: "hidden" }}
            >
                <div
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{
                        width: 1280,
                        height: 720,
                        transformOrigin: "top left",
                        transform: `scale(${SCALE})`,
                    }}
                >
                    <V1ContentRender slide={slide} isEditMode={true} />
                </div>
            </div>
            {/* <div className=" slide-box relative z-50  overflow-hidden aspect-video">
                <div className="absolute bg-transparent z-50 top-0 left-0 w-full h-full" />
                <div className="transform scale-[0.2] flex  pointer-events-none justify-center items-center origin-top-left  w-[500%] h-[500%]"

                >
                    <ContentRender slide={slide} isEditMode={true} />
                </div>
            </div> */}
        </div>
    );
} 
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { setOutlines } from "@/store/slices/presentationGeneration";
import { jsonrepair } from "jsonrepair";
import { RootState } from "@/store/store";



export const useOutlineStreaming = (presentationId: string | null) => {
  const dispatch = useDispatch();
  const { outlines } = useSelector((state: RootState) => state.presentationGeneration);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const [highestActiveIndex, setHighestActiveIndex] = useState<number>(-1);
  const prevSlidesRef = useRef<{ content: string }[]>([]);
  const activeIndexRef = useRef<number>(-1);
  const highestIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!presentationId || outlines.length > 0) return;

    let eventSource: EventSource;
    let accumulatedChunks = "";

    const initializeStream = async () => {
      setIsStreaming(true)
      setIsLoading(true)
      try {
        eventSource = new EventSource(
          `/api/v1/ppt/outlines/stream/${presentationId}`
        );

        eventSource.addEventListener("response", (event) => {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "chunk":
              // 
              accumulatedChunks += data.chunk;
              // 
              try {
                const repairedJson = jsonrepair(accumulatedChunks);
                const partialData = JSON.parse(repairedJson);

                if (partialData.slides) {
                  const nextSlides: { content: string }[] = partialData.slides || [];
                  // Determine which slide index changed to minimize live parsing
                  try {
                    const prev = prevSlidesRef.current || [];
                    let changedIndex: number | null = null;
                    const maxLen = Math.max(prev.length, nextSlides.length);
                    for (let i = 0; i < maxLen; i++) {
                      const prevContent = prev[i]?.content;
                      const nextContent = nextSlides[i]?.content;
                      if (nextContent !== prevContent) {
                        changedIndex = i;
                      }
                    }
                    // Keep active index stable if no change detected; and ensure non-decreasing
                    const prevActive = activeIndexRef.current;
                    let nextActive = changedIndex ?? prevActive;
                    if (nextActive < prevActive) {
                      nextActive = prevActive;
                    }
                    activeIndexRef.current = nextActive;
                    setActiveSlideIndex(nextActive);

                    if (nextActive > highestIndexRef.current) {
                      highestIndexRef.current = nextActive;
                      setHighestActiveIndex(nextActive);
                    }
                  } catch { }

                  prevSlidesRef.current = nextSlides;
                  dispatch(setOutlines(nextSlides));
                  setIsLoading(false)
                }
              } catch (error) {
                // JSON isn't complete yet, continue accumulating
              }
              break;

            case "complete":

              try {
                const outlinesData: { content: string }[] = data.presentation.outlines.slides;
                dispatch(setOutlines(outlinesData));
                setIsStreaming(false)
                setIsLoading(false)
                setActiveSlideIndex(null)
                setHighestActiveIndex(-1)
                prevSlidesRef.current = outlinesData;
                activeIndexRef.current = -1;
                highestIndexRef.current = -1;
                eventSource.close();
              } catch (error) {
                console.error("Error parsing accumulated chunks:", error);
                toast.error("Failed to parse presentation data");
                eventSource.close();
              }
              accumulatedChunks = "";
              break;

            case "closing":

              setIsStreaming(false)
              setIsLoading(false)
              setActiveSlideIndex(null)
              setHighestActiveIndex(-1)
              activeIndexRef.current = -1;
              highestIndexRef.current = -1;
              eventSource.close();
              break;
            case "error":

              setIsStreaming(false)
              setIsLoading(false)
              setActiveSlideIndex(null)
              setHighestActiveIndex(-1)
              activeIndexRef.current = -1;
              highestIndexRef.current = -1;
              eventSource.close();
              toast.error('Error in outline streaming',
                {
                  description: data.detail || 'Failed to connect to the server. Please try again.',
                }
              );
              break;
          }
        });

        eventSource.onerror = () => {

          setIsStreaming(false)
          setIsLoading(false)
          setActiveSlideIndex(null)
          setHighestActiveIndex(-1)
          activeIndexRef.current = -1;
          highestIndexRef.current = -1;
          eventSource.close();
          toast.error("Failed to connect to the server. Please try again.");
        };
      } catch (error) {

        setIsStreaming(false)
        setIsLoading(false)
        setActiveSlideIndex(null)
        setHighestActiveIndex(-1)
        activeIndexRef.current = -1;
        highestIndexRef.current = -1;
        toast.error("Failed to initialize connection");
      }
    };
    initializeStream();
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [presentationId, dispatch]);

  return { isStreaming, isLoading, activeSlideIndex, highestActiveIndex };
}; 
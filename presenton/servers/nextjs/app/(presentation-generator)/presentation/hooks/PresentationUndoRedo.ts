import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { finishUndoRedo, redo, undo } from "@/store/slices/undoRedoSlice";
import { useKeyboardShortcut } from "../../hooks/use-keyboard-shortcut";
import { setPresentationData } from "@/store/slices/presentationGeneration";





export const usePresentationUndoRedo = () => {
    const dispatch = useDispatch();
    const undoRedoState = useSelector((state: RootState) => state.undoRedo);
    const { presentationData } = useSelector((state: RootState) => state.presentationGeneration);

    const canUndo = undoRedoState.past.length > 0;
    const canRedo = undoRedoState.future.length > 0;

    const onUndo = useCallback(() => {
      if (!canUndo) return;

      const previousState = undoRedoState.past[undoRedoState.past.length - 1];

      dispatch(undo());

      if (previousState) {
        const newSlides = JSON.parse(JSON.stringify(previousState.slides));

        dispatch(
          setPresentationData({
            ...presentationData!,
            slides: newSlides,
          })
        );
      }

      setTimeout(() => {
        dispatch(finishUndoRedo());
      }, 100);
    }, [canUndo, dispatch, presentationData, undoRedoState.past]);

    const onRedo = useCallback(() => {
      if (!canRedo) return;

      const nextState = undoRedoState.future[0];

      dispatch(redo());

      if (nextState) {
        const newSlides = JSON.parse(JSON.stringify(nextState.slides));

        dispatch(
          setPresentationData({
            ...presentationData!,
            slides: newSlides,
          })
        );
      }

      setTimeout(() => {
        dispatch(finishUndoRedo());
      }, 100);
    }, [canRedo, dispatch, presentationData, undoRedoState.future]);

     // Handle undo
  useKeyboardShortcut(
    ["z"],
    (e) => {
      if (e.ctrlKey && !e.shiftKey && undoRedoState.past.length > 0) {
        e.preventDefault();

        // Get the previous state before dispatching undo
        const previousState = undoRedoState.past[undoRedoState.past.length - 1];

        // Perform undo
        dispatch(undo());

        // Use the previousState directly instead of relying on the updated undoRedoState
        if (previousState) {
          // Create a deep copy to ensure no reference issues
          const newSlides = JSON.parse(JSON.stringify(previousState.slides));

          // Update the presentation data with the properly structured slides
          dispatch(
            setPresentationData({
              ...presentationData!,
              slides: newSlides,
            })
          );
        }
        // Reset the undo/redo flag
        setTimeout(() => {
          dispatch(finishUndoRedo());
        }, 100);
      }
    },
    [undoRedoState.past, presentationData]
  );
  // Handle redo
  useKeyboardShortcut(
    ["z"],
    (e) => {
      if (e.ctrlKey && e.shiftKey && undoRedoState.future.length > 0) {
        e.preventDefault();

        // Get the next state before dispatching redo
        const nextState = undoRedoState.future[0];

        // Perform redo
        dispatch(redo());

        // Use the nextState directly instead of relying on the updated undoRedoState
        if (nextState) {
          // Create a deep copy to ensure no reference issues
          const newSlides = JSON.parse(JSON.stringify(nextState.slides));

          // Update the presentation data with the properly structured slides
          dispatch(
            setPresentationData({
              ...presentationData!,
              slides: newSlides,
            })
          );
        }
        // Reset the undo/redo flag
        setTimeout(() => {
          dispatch(finishUndoRedo());
        }, 100);
      }
    },
    [undoRedoState.future, presentationData]
  );

  return { onUndo, onRedo, canUndo, canRedo };
}
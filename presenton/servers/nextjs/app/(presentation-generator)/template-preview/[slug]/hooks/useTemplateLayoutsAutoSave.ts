'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { FASTAPI_URL } from '@/constants';
import { getHeader } from '@/app/(presentation-generator)/services/api/header';
import { ApiResponseHandler } from '@/app/(presentation-generator)/services/api/api-error-handler';
import { ProcessedSlide } from '@/app/custom-template/types';
import { CustomTemplateLayout } from '@/app/hooks/useCustomTemplates';

interface LayoutPayload {
    layout_id: string;
    layout_code: string;
    layout_name: string;
}

interface UseTemplateLayoutsAutoSaveOptions {
    templateId: string | null;
    layouts: CustomTemplateLayout[];
    slideStates: ProcessedSlide[];
    debounceMs?: number;
    enabled?: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useTemplateLayoutsAutoSave = ({
    templateId,
    layouts,
    slideStates,
    debounceMs = 2000,
    enabled = true,
}: UseTemplateLayoutsAutoSaveOptions) => {
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedDataRef = useRef<string>('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const isSavingRef = useRef<boolean>(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    // Build the payload for saving
    const buildPayload = useCallback((): LayoutPayload[] => {
        const payload: LayoutPayload[] = [];

        layouts.forEach((layout, index) => {
            const slideState = slideStates[index];
            if (slideState?.react && layout.rawLayoutId) {
                payload.push({
                    layout_id: layout.rawLayoutId,
                    layout_code: slideState.react,
                    layout_name: slideState.layout_name || `Slide${index + 1}`
                });
            }
        });

        return payload;
    }, [layouts, slideStates]);

    // Save function
    const saveLayouts = useCallback(async (payload: LayoutPayload[]) => {
        if (!templateId || payload.length === 0 || isSavingRef.current) {
            return false;
        }

        const currentDataString = JSON.stringify(payload);

        // Skip if data hasn't changed since last save
        if (currentDataString === lastSavedDataRef.current) {
            return false;
        }

        try {
            isSavingRef.current = true;
            setSaveStatus('saving');
            console.log('🔄 Auto-saving template layouts...');

            const response = await fetch(`${FASTAPI_URL}/api/v1/ppt/template/update`, {
                method: 'PUT',
                headers: getHeader(),
                body: JSON.stringify({
                    id: templateId,

                    layouts: payload,
                }),
            });

            await ApiResponseHandler.handleResponse(response, 'Failed to auto-save layouts');

            // Update last saved data reference
            lastSavedDataRef.current = currentDataString;
            setLastSavedAt(new Date());
            setSaveStatus('saved');
            console.log('✅ Auto-save successful');

            // Reset to idle after showing "saved" briefly
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);

            return true;
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            setSaveStatus('error');

            // Reset to idle after showing error briefly
            setTimeout(() => {
                setSaveStatus('idle');
            }, 3000);

            return false;
        } finally {
            isSavingRef.current = false;
        }
    }, [templateId]);

    // Debounced save trigger
    const debouncedSave = useCallback(() => {
        if (!enabled || !templateId) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(() => {
            const payload = buildPayload();
            if (payload.length > 0) {
                saveLayouts(payload);
            }
        }, debounceMs);
    }, [enabled, templateId, buildPayload, saveLayouts, debounceMs]);

    // Watch for changes in slideStates
    useEffect(() => {
        if (!enabled || !templateId || slideStates.length === 0) return;

        // Check if any slide is still processing
        const hasProcessingSlide = Array.from(slideStates.values()).some(
            slide => slide.processing
        );

        if (hasProcessingSlide) return;

        debouncedSave();

        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [slideStates, enabled, templateId, debouncedSave]);

    // Manual save function
    const saveNow = useCallback(async () => {
        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        const payload = buildPayload();
        return saveLayouts(payload);
    }, [buildPayload, saveLayouts]);

    // Cleanup on unmount - save any pending changes
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        saveStatus,
        lastSavedAt,
        saveNow,
    };
};


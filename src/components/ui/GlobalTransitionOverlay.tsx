'use client'

import { useAppStore } from '@/store/useAppStore'

export function GlobalTransitionOverlay() {
    const isTransitioning = useAppStore((state) => state.isTransitioning)

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-white pointer-events-none transition-opacity ${isTransitioning ? 'opacity-100 duration-1000' : 'opacity-0 duration-[3000ms]'
                }`}
        />
    )
}

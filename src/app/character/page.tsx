'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

export default function CharacterPage() {
    const { setTransitionState } = useAppStore()
    const [isIframeLoaded, setIsIframeLoaded] = useState(false)

    useEffect(() => {
        if (isIframeLoaded) {
            setTransitionState('out')
        }
    }, [isIframeLoaded, setTransitionState])

    return (
        <div className="fixed inset-0 w-full h-full bg-black z-0">
            <iframe
                src="/character-page/index.html"
                className="w-full h-full border-none"
                onLoad={() => setIsIframeLoaded(true)}
                title="Genshin Fanmade Web"
            />
        </div>
    )
}

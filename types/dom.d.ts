/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Ensure DOM globals are available
declare global {
    // Window and document should be available in client components
    interface Window {
        location: Location
        localStorage: Storage
        addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
        removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
        requestAnimationFrame(callback: FrameRequestCallback): number
        innerWidth: number
        alert(message?: any): void
    }

    interface Document {
        createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K]
        getElementById(elementId: string): HTMLElement | null
        body: HTMLElement
        activeElement: Element | null
    }

    interface HTMLElement {
        scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void
    }

    interface Navigator {
        userAgent: string
        clipboard?: Clipboard
    }

    interface Clipboard {
        writeText(data: string): Promise<void>
    }

    // Make sure we have access to all standard DOM APIs
    const window: Window & typeof globalThis
    const document: Document
    const navigator: Navigator

    // Ensure HTMLElement properties are properly typed
    interface HTMLInputElement {
        value: string
    }

    interface HTMLTextAreaElement {
        value: string
        scrollTop: number
        scrollHeight: number
        focus(): void
        setSelectionRange(start: number, end: number): void
    }

    interface HTMLSelectElement {
        value: string
    }

    interface HTMLDivElement {
        scrollTop: number
        scrollHeight: number
        clientHeight: number
        addEventListener<K extends keyof HTMLElementEventMap>(
            type: K,
            listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any,
            options?: boolean | AddEventListenerOptions
        ): void
        removeEventListener<K extends keyof HTMLElementEventMap>(
            type: K,
            listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any,
            options?: boolean | EventListenerOptions
        ): void
    }

    interface HTMLHeadingElement {
        offsetHeight: number
        textContent: string | null
    }

    // Request types
    interface RequestInit {
        cache?: RequestCache
    }

    type RequestCache =
        | 'default'
        | 'no-store'
        | 'reload'
        | 'no-cache'
        | 'force-cache'
        | 'only-if-cached'

    // DOMRect
    interface DOMRect {
        readonly bottom: number
        readonly height: number
        readonly left: number
        readonly right: number
        readonly top: number
        readonly width: number
        readonly x: number
        readonly y: number
    }

    // IntersectionObserver
    interface IntersectionObserverEntry {
        readonly boundingClientRect: DOMRectReadOnly
        readonly intersectionRatio: number
        readonly intersectionRect: DOMRectReadOnly
        readonly isIntersecting: boolean
        readonly rootBounds: DOMRectReadOnly | null
        readonly target: Element
        readonly time: DOMHighResTimeStamp
    }

    interface IntersectionObserver {
        readonly root: Element | Document | null
        readonly rootMargin: string
        readonly thresholds: ReadonlyArray<number>
        disconnect(): void
        observe(target: Element): void
        takeRecords(): IntersectionObserverEntry[]
        unobserve(target: Element): void
    }

    const IntersectionObserver: {
        prototype: IntersectionObserver
        new(callback: IntersectionObserverCallback, options?: IntersectionObserverInit): IntersectionObserver
    }
}

export { } 
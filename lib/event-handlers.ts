import React from 'react'

// Utility types for event handlers
export type InputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => void
export type TextAreaChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => void
export type SelectChangeHandler = (e: React.ChangeEvent<HTMLSelectElement>) => void

// Utility functions for creating properly typed event handlers
export const createInputHandler = (setter: (value: string) => void): InputChangeHandler => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        setter((e.target as HTMLInputElement).value)
    }
}

export const createTextAreaHandler = (setter: (value: string) => void): TextAreaChangeHandler => {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setter((e.target as HTMLTextAreaElement).value)
    }
}

export const createSelectHandler = (setter: (value: string) => void): SelectChangeHandler => {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
        setter((e.target as HTMLSelectElement).value)
    }
}

// DOM utility functions for client components
export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(key)
        }
        return null
    },
    setItem: (key: string, value: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, value)
        }
    },
    removeItem: (key: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(key)
        }
    },
}

export const safeWindow = {
    addEventListener: (event: string, handler: EventListenerOrEventListenerObject): void => {
        if (typeof window !== 'undefined') {
            window.addEventListener(event, handler)
        }
    },
    removeEventListener: (event: string, handler: EventListenerOrEventListenerObject): void => {
        if (typeof window !== 'undefined') {
            window.removeEventListener(event, handler)
        }
    },
    location: {
        href: typeof window !== 'undefined' ? window.location?.href : '',
        origin: typeof window !== 'undefined' ? window.location?.origin : '',
    },
}

export const safeNavigator = {
    clipboard: {
        writeText: async (text: string): Promise<void> => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                return navigator.clipboard.writeText(text)
            }
            throw new Error('Clipboard API not available')
        },
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
}

export const safeDocument = {
    createElement: (tagName: string): HTMLElement | null => {
        if (typeof document !== 'undefined') {
            return document.createElement(tagName)
        }
        return null
    },
    getElementById: (id: string): HTMLElement | null => {
        if (typeof document !== 'undefined') {
            return document.getElementById(id)
        }
        return null
    },
} 
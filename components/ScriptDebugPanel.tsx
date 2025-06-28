'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Button } from './ui/button'
import { ChevronDown, ChevronRight, Bug, Clock, GripHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { safeLocalStorage } from '@/lib/event-handlers'

interface ScriptDebugPanelProps {
  state: string
  editorContent: string
  prompt: string
  scriptId: string | null
  requestId: string | null
  luckyRequestId: string | null
  isFromLucky: boolean
  isFromSuggestion: boolean
  error: string | null
}

export default function ScriptDebugPanel({
  state,
  editorContent,
  prompt,
  scriptId,
  requestId,
  luckyRequestId,
  isFromLucky,
  isFromSuggestion,
  error,
}: ScriptDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [timestamp, setTimestamp] = useState(new Date())
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load saved position from localStorage on mount
  useEffect(() => {
    try {
      const savedPosition = safeLocalStorage.getItem('scriptDebugPanelPosition')
      if (savedPosition) {
        setPosition(JSON.parse(savedPosition))
      }
    } catch (e) {
      console.error('Failed to load debug panel position from localStorage', e)
    }
  }, [])

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      safeLocalStorage.setItem('scriptDebugPanelPosition', JSON.stringify(position))
    }
  }, [position])

  // Update timestamp whenever any prop changes
  useEffect(() => {
    setTimestamp(new Date())
  }, [
    state,
    editorContent,
    prompt,
    scriptId,
    requestId,
    luckyRequestId,
    isFromLucky,
    isFromSuggestion,
    error,
  ])

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && typeof window !== 'undefined') {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add and remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    } else {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development' || !mounted) return null

  const debugPanel = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2147483647,
      }}
    >
      <Card
        ref={cardRef}
        className="fixed shadow-2xl opacity-90 hover:opacity-100 transition-opacity"
        style={{
          bottom: position.y === 0 ? '0' : 'auto',
          right: position.x === 0 ? '0' : 'auto',
          top: position.y !== 0 ? `${position.y}px` : 'auto',
          left: position.x !== 0 ? `${position.x}px` : 'auto',
          width: '100%',
          maxWidth: '480px',
          cursor: isDragging ? 'grabbing' : 'auto',
          border: '2px solid',
          borderColor: state === 'complete' ? 'hsl(var(--primary))' : 'hsl(var(--amber-500))',
          isolation: 'isolate',
          pointerEvents: 'all',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        <CardHeader
          className="bg-amber-400/10 p-2 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          style={{
            pointerEvents: 'all',
            touchAction: 'none',
          }}
        >
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <GripHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
              </div>

              <CardTitle className="text-sm flex gap-2 items-center">
                <Bug className="h-4 w-4" />
                Script Debug Panel
                <Badge variant={state === 'complete' ? 'default' : 'secondary'} className="ml-2">
                  {state}
                </Badge>
                <div className="text-xs ml-auto flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timestamp.toLocaleTimeString()}
                </div>
              </CardTitle>
            </div>

            <CollapsibleContent>
              <CardContent className="p-3 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold">Script ID:</div>
                    <div className="font-mono bg-muted p-1 rounded text-[10px] break-all">
                      {scriptId || 'null'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold">Request ID:</div>
                    <div className="font-mono bg-muted p-1 rounded text-[10px] break-all">
                      {requestId || 'null'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold">Lucky Request ID:</div>
                    <div className="font-mono bg-muted p-1 rounded text-[10px] break-all">
                      {luckyRequestId || 'null'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold">Flags:</div>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant={isFromLucky ? 'default' : 'outline'} className="text-[10px]">
                        isFromLucky: {isFromLucky.toString()}
                      </Badge>
                      <Badge
                        variant={isFromSuggestion ? 'default' : 'outline'}
                        className="text-[10px]"
                      >
                        isFromSuggestion: {isFromSuggestion.toString()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="space-y-1">
                    <div className="font-bold text-xs">Error:</div>
                    <div className="font-mono bg-destructive/20 text-destructive p-2 rounded text-xs">
                      {error}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="font-bold text-xs">Prompt:</div>
                  <ScrollArea className="h-20 w-full rounded border">
                    <div className="font-mono p-2 text-xs whitespace-pre-wrap">{prompt}</div>
                  </ScrollArea>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-xs">Editor Content:</div>
                  <ScrollArea className="h-40 w-full rounded border">
                    <pre className="font-mono p-2 text-xs overflow-visible whitespace-pre-wrap">
                      {editorContent || '<empty>'}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last updated: {timestamp.toLocaleString()}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    </div>
  )

  // Use createPortal to render at the highest level
  return createPortal(debugPanel, document.body)
}

import React from 'react'

interface DeleteConfirmationOverlayProps {
  onConfirm: () => void
  onCancel: () => void
  scriptTitle?: string
}

export function DeleteConfirmationOverlay({
  onConfirm,
  onCancel,
  scriptTitle,
}: DeleteConfirmationOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="bg-neutral-900 p-6 rounded-lg text-white max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">
          Are you sure you want to delete {scriptTitle || 'this script'}?
        </h2>
        <p className="text-neutral-400 mb-6">This action cannot be undone.</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

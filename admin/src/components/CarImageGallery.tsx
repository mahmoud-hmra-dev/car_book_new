import React, { useState, useRef, useCallback } from 'react'
import {
  Close as CloseIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as CarService from '@/services/CarService'
import * as helper from '@/utils/helper'


const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']

const isVideo = (filename: string): boolean => {
  const lower = filename.toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

interface CarImageGalleryProps {
  carId: string
  images: string[]
  onChange: (images: string[]) => void
  disabled?: boolean
}

const CarImageGallery = ({
  carId,
  images,
  onChange,
  disabled = false,
}: CarImageGalleryProps) => {
  const [uploading, setUploading] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target
    if (!files || files.length === 0) {
      return
    }

    try {
      setUploading(true)
      const fileArray = Array.from(files)
      const newImages = await CarService.addImages(carId, fileArray)
      onChange([...images, ...newImages])
    } catch (err) {
      helper.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [carId, images, onChange])

  const handleDelete = useCallback(async (image: string) => {
    if (disabled) {
      return
    }

    try {
      const status = await CarService.deleteCarImageFromList(carId, image)
      if (status === 200) {
        const updated = images.filter((img) => img !== image)
        onChange(updated)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }, [carId, disabled, images, onChange])

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (disabled) {
      return
    }
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (dragIndex === null || dragIndex === dropIndex || disabled) {
      setDragIndex(null)
      return
    }

    const reordered = [...images]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, moved)

    onChange(reordered)
    setDragIndex(null)

    try {
      const status = await CarService.reorderImages(carId, reordered)
      if (status !== 200) {
        onChange(images)
        helper.error()
      }
    } catch (err) {
      onChange(images)
      helper.error(err)
    }
  }, [carId, disabled, dragIndex, images, onChange])

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="mt-2 mb-4">
      <h3 className="my-4 mb-2 text-base font-medium text-text-secondary">Additional Images &amp; Videos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, index) => {
          const url = bookcarsHelper.joinURL(env.CDN_CARS, img)
          const video = isVideo(img)
          const isDragging = dragIndex === index
          const isDragOver = dragOverIndex === index

          return (
            <div
              key={img}
              className={`group relative aspect-[4/3] rounded-xl overflow-hidden border-2 bg-background cursor-grab transition-all duration-200 active:cursor-grabbing ${isDragging ? 'opacity-50 border-dashed border-primary' : isDragOver ? 'border-dashed border-primary' : 'border-transparent'}`}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {video ? (
                <>
                  <video src={url} muted preload="metadata" className="w-full h-full object-cover block" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <PlayArrowIcon className="!w-10 !h-10 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
                  </div>
                </>
              ) : (
                <img src={url} alt={`Car image ${index + 1}`} loading="lazy" className="w-full h-full object-cover block" />
              )}
              {!disabled && (
                <button
                  type="button"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm hover:bg-black/70"
                  onClick={() => handleDelete(img)}
                  aria-label="Delete image"
                >
                  <CloseIcon fontSize="small" />
                </button>
              )}
            </div>
          )
        })}

        {uploading && (
          <div className="flex items-center justify-center aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-primary/5">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!disabled && (
          <label
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5"
            onClick={handleAddClick}
          >
            <AddIcon className="!text-2xl text-text-muted mb-1" />
            <span className="text-xs text-text-muted">Add Images</span>
          </label>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}

export default CarImageGallery

import React, { useState, useRef, useCallback } from 'react'
import { CircularProgress } from '@mui/material'
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
      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-3 max-sm:grid-cols-2">
        {images.map((img, index) => {
          const url = bookcarsHelper.joinURL(env.CDN_CARS, img)
          const video = isVideo(img)
          const isDragging = dragIndex === index
          const isDragOver = dragOverIndex === index

          return (
            <div
              key={img}
              className={`relative rounded-xl overflow-hidden aspect-[4/3] bg-background cursor-grab transition-[opacity,border-color] duration-200 border-2 border-transparent active:cursor-grabbing ${isDragging ? 'opacity-50 !border-dashed !border-primary' : ''} ${isDragOver ? '!border-dashed !border-primary' : ''}`}
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
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 border-none cursor-pointer flex items-center justify-center p-0 transition-colors duration-200 z-[2] hover:bg-black/80 [&_svg]:w-4 [&_svg]:h-4"
                  onClick={() => handleDelete(img)}
                  aria-label="Delete image"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )
        })}

        {uploading && (
          <div className="flex items-center justify-center aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-primary/5">
            <CircularProgress size={32} />
          </div>
        )}

        {!disabled && (
          <button
            type="button"
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer aspect-[4/3] bg-transparent transition-[border-color,background] duration-200 gap-1 p-0 hover:border-primary hover:bg-primary/5 [&_svg]:w-8 [&_svg]:h-8 [&_svg]:text-text-muted [&_span]:text-xs [&_span]:text-text-muted"
            onClick={handleAddClick}
          >
            <AddIcon />
            <span>Add images</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}

export default CarImageGallery

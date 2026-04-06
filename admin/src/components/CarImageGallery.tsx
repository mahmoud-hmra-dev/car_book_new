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

import '@/assets/css/car-image-gallery.css'

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
    <div className="car-image-gallery">
      <h3 className="car-image-gallery-title">Additional Images &amp; Videos</h3>
      <div className="car-image-gallery-grid">
        {images.map((img, index) => {
          const url = bookcarsHelper.joinURL(env.CDN_CARS, img)
          const video = isVideo(img)
          const itemClass = [
            'car-image-gallery-item',
            dragIndex === index ? 'dragging' : '',
            dragOverIndex === index ? 'drag-over' : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={img}
              className={itemClass}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {video ? (
                <>
                  <video src={url} muted preload="metadata" />
                  <div className="car-image-gallery-video-overlay">
                    <PlayArrowIcon />
                  </div>
                </>
              ) : (
                <img src={url} alt={`Car image ${index + 1}`} loading="lazy" />
              )}
              {!disabled && (
                <button
                  type="button"
                  className="car-image-gallery-delete-btn"
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
          <div className="car-image-gallery-uploading">
            <CircularProgress size={32} />
          </div>
        )}

        {!disabled && (
          <button
            type="button"
            className="car-image-gallery-add-btn"
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

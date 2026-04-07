import React, { ReactNode, useEffect, useRef } from 'react'
import { ExpandMore as ChevronIcon } from '@mui/icons-material'

interface AccordionProps {
  title?: string
  className?: string
  collapse?: boolean
  offsetHeight?: number
  children: ReactNode
}

const Accordion = ({
  title,
  className,
  collapse,
  offsetHeight = 0,
  children
}: AccordionProps) => {
  const accordionRef = useRef<HTMLButtonElement>(null)

  const handleAccordionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.toggle('accordion-active')
    const panel = e.currentTarget.nextElementSibling as HTMLDivElement
    const _collapse = panel.classList.contains('panel-collapse')

    if (panel.style.maxHeight || _collapse) {
      if (_collapse) {
        panel.classList.remove('panel-collapse')
        panel.classList.add('panel')
      }

      panel.style.maxHeight = ''
    } else {
      panel.style.maxHeight = `${panel.scrollHeight + offsetHeight}px`
    }
  }

  useEffect(() => {
    if (collapse && accordionRef.current) {
      accordionRef.current.classList.add('accordion-active')
    }
  }, [collapse])

  useEffect(() => {
    if (collapse && accordionRef.current) {
      const panel = accordionRef.current.nextElementSibling as HTMLDivElement
      panel.style.maxHeight = `${panel.scrollHeight + offsetHeight}px`
    }
  }, [offsetHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`bg-white rounded-2xl border border-border shadow-sm overflow-hidden${className ? ` ${className}` : ''}`}>
      <button
        ref={accordionRef}
        type="button"
        onClick={handleAccordionClick}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-background/50 transition-colors [&.accordion-active]:border-b [&.accordion-active]:border-b-border group"
      >
        <span className="text-sm font-bold text-text">{title}</span>
        <ChevronIcon className="text-text-muted transition-transform duration-200 group-[.accordion-active]:rotate-180" />
      </button>
      <div className={collapse ? 'overflow-hidden' : 'max-h-0 overflow-hidden transition-[max-height] duration-200 ease-out'}>
        <div className="px-5 pb-4">{children}</div>
      </div>
    </div>
  )
}

export default Accordion

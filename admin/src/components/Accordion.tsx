import React, { ReactNode, useEffect, useRef } from 'react'

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
  const accordionRef = useRef<HTMLSpanElement>(null)

  const handleAccordionClick = (e: React.MouseEvent<HTMLElement>) => {
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
    <div className={`${className ? `${className} ` : ''}bg-white my-2.5 border border-border rounded-xl text-[13px] select-none shadow-sm`}>
      <span
        ref={accordionRef}
        className="flex items-center justify-between py-3 px-4 cursor-pointer text-sm font-semibold text-text hover:text-primary transition-colors duration-200 after:content-[''] after:border-t-[5px] after:border-t-transparent after:border-l-[5px] after:border-l-text-muted after:border-b-[5px] after:border-b-transparent after:transition-transform after:duration-150 after:ease-in-out [&.accordion-active]:border-b [&.accordion-active]:border-b-border [&.accordion-active]:rounded-t-xl [&.accordion-active]:rounded-b-none [&.accordion-active]:after:rotate-90"
        onClick={handleAccordionClick}
        role="button"
        tabIndex={0}
      >
        {title}
      </span>
      <div className={collapse ? 'overflow-hidden' : 'max-h-0 overflow-hidden transition-[max-height] duration-200 ease-out'}>{children}</div>
    </div>
  )
}

export default Accordion

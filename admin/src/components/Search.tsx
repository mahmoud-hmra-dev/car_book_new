import React, { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'
import { schema, FormFields } from '@/models/SearchForm'

interface SearchProps {
  className?: string
  onSubmit?: (value: string) => void
}

const Search = ({
  className,
  onSubmit
}: SearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, control } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const keyword = useWatch({ control, name: 'keyword' })

  const handleFormSubmit = (data: FormFields) => {
    if (onSubmit) {
      onSubmit(data.keyword || '')
    }
  }

  return (
    <div className={`${className || ''} relative`}>
      <form autoComplete="off" onSubmit={handleSubmit(handleFormSubmit)} className="flex items-center gap-1">
        <input autoComplete="false" name="hidden" type="text" style={{ display: 'none' }} />
        <div className="relative">
          <SearchIcon className="!absolute !left-3.5 !top-1/2 !-translate-y-1/2 !w-5 !h-5 !text-text-muted pointer-events-none" />
          <input
            ref={(el) => {
              register('keyword').ref(el)
              ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
            }}
            {...register('keyword')}
            placeholder={commonStrings.SEARCH_PLACEHOLDER}
            id="search"
            className="w-[280px] h-11 pl-11 pr-10 rounded-xl border border-border bg-white text-sm text-text placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => {
                setValue('keyword', '')
                inputRef.current?.focus()
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-background text-text-muted transition-colors"
            >
              <ClearIcon className="!w-4 !h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary/5 text-primary transition-colors"
        >
          <SearchIcon />
        </button>
      </form>
    </div>
  )
}

export default Search

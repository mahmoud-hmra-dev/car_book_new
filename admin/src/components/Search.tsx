import React, { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconButton, TextField, InputAdornment } from '@mui/material'
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
          <SearchIcon className="!absolute !left-3 !top-1/2 !-translate-y-1/2 !w-5 !h-5 !text-text-muted pointer-events-none" />
          <TextField
            inputRef={inputRef}
            variant="outlined"
            size="small"
            {...register('keyword')}
            placeholder={commonStrings.SEARCH_PLACEHOLDER}
            slotProps={{
              input: {
                endAdornment: keyword ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setValue('keyword', '')
                        inputRef.current?.focus()
                      }}
                    >
                      <ClearIcon className="!w-4 !h-4" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                className: '!pl-10 !rounded-lg !text-sm !h-10',
              }
            }}
            className="w-[280px]"
            id="search"
          />
        </div>
        <IconButton type="submit" className="!w-10 !h-10 !rounded-lg hover:!bg-primary/5 !text-primary">
          <SearchIcon />
        </IconButton>
      </form>
    </div>
  )
}

export default Search

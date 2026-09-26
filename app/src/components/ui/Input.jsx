import { forwardRef } from 'react'
import { cn } from '../../utils/helpers'

const Input = forwardRef(({ 
  className, 
  label, 
  error, 
  hint, 
  id, 
  ...props 
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  // Handle paste event for password fields where onChange may not fire
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText && props.onChange) {
      // Create a synthetic event with the pasted value
      const syntheticEvent = {
        target: { 
          name: props.name, 
          value: pastedText,
          type: 'paste'
        },
        ...e
      }
      props.onChange(syntheticEvent)
    }
    if (props.onPaste) {
      props.onPaste(e)
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn('input', error && 'input-error', className)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        onPaste={handlePaste}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-bl-sand">
          {hint}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export { Input }
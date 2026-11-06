import { useState } from 'react'

type PasswordFieldProps = {
  id: string
  label: string
  name: string
  autoComplete: 'new-password' | 'current-password'
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  minLength?: number
  describedBy?: string
}

export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  onChange,
  disabled = false,
  required = false,
  minLength,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const toggleLabel = `${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          required={required}
          minLength={minLength}
          spellCheck={false}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-pressed={visible}
          aria-label={toggleLabel}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
    )
}


import * as React from "react"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, id, ...props }) => {
  return (
    <label htmlFor={id} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onCheckedChange(e.target.checked)}
        style={{ display: 'none' }}
        {...props}
      />
      <span
        style={{
          width: 40,
          height: 20,
          background: checked ? '#4ade80' : '#d1d5db',
          borderRadius: 9999,
          position: 'relative',
          transition: 'background 0.2s',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: checked ? 22 : 2,
            top: 2,
            width: 16,
            height: 16,
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'left 0.2s',
          }}
        />
      </span>
    </label>
  )
}

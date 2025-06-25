"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Check, X } from "lucide-react"

interface EditableStatCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  onValueChange: (newValue: number) => void
  formatValue?: (value: number) => React.ReactNode
}

export function EditableStatCard({ 
  title, 
  value, 
  description, 
  icon, 
  onValueChange,
  formatValue = (val) => `₨${Math.round(val).toLocaleString('en-PK')}`
}: EditableStatCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")

  const handleEdit = () => {
    setEditValue(value.toString())
    setIsEditing(true)
  }

  const handleSave = () => {
    const newValue = parseFloat(editValue)
    if (!isNaN(newValue)) {
      onValueChange(newValue)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {icon}
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-2xl font-bold"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold">{formatValue(value)}</div>
            <p className="text-base text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
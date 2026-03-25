"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, X, Plus } from "lucide-react"

interface Tag {
  _id: string
  name: string
  slug?: string
}

interface OfferWizardStep2Props {
  title: string
  description: string
  selectedTags: string[]
  customTag: string
  categories: Tag[]
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onToggleTag: (tagId: string) => void
  onRemoveTag: (tagId: string) => void
  onCustomTagChange: (value: string) => void
  onAddCustomTag: (tagName: string) => void
}

export function OfferWizardStep2({
  title,
  description,
  selectedTags,
  customTag,
  categories,
  onTitleChange,
  onDescriptionChange,
  onToggleTag,
  onRemoveTag,
  onCustomTagChange,
  onAddCustomTag,
}: OfferWizardStep2Props) {
  const getTagLabel = (tagId: string) => {
    const matched = categories.find((category) => category._id === tagId || category.name === tagId)
    return matched?.name || null
  }

  return (
    <div className="space-y-6">
      {/* <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Remember: This offer must be exclusive to EATINOUT and not available on your menu or social media.
        </AlertDescription>
      </Alert> */}

      <div className="space-y-2">
        <Label htmlFor="title">Offer Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., 2 for 1 on all pasta dishes"
          maxLength={40}
        />
        <p className="text-xs text-muted-foreground">{title.length}/40 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Offer Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Give us more information about this offer..."
          rows={5}
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground">{description.length}/300 characters</p>
      </div>

      <div className="space-y-3">
        <Label>Offer Tags (optional)</Label>
        <p className="text-sm text-muted-foreground">Add your own tag if necessary...</p>

        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
          {categories.map((category) => (
            <Badge
              key={category._id}
              variant={selectedTags.includes(category._id) ? "default" : "outline"}
              className="cursor-pointer transition-colors hover:bg-[#E31E24] hover:text-white"
              onClick={() => onToggleTag(category._id)}
            >
              {category.name}
              {selectedTags.includes(category._id) && (
                <X
                  className="ml-1 h-3 w-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveTag(category._id)
                  }}
                />
              )}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add your own tag (e.g., Live Music, Rooftop)"
            value={customTag}
            onChange={(e) => onCustomTagChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onAddCustomTag(customTag)
              }
            }}
            maxLength={25}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onAddCustomTag(customTag)}
            disabled={!customTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {selectedTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Selected Tags ({selectedTags.filter(tag => getTagLabel(tag) !== null).length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => {
                const label = getTagLabel(tag)
                if (!label) return null  // ✅ skip rendering if tag not in categories
                return (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {label}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onRemoveTag(tag)} />
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


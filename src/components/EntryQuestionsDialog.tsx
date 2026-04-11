import { useState } from "react"
import { Button } from "@/components/ui/button"

interface EntryQuestionsDialogProps {
  isOpen: boolean
  stepName: string
  stepDescription?: string
  questions: string[]
  onSubmit: (answers: Record<number, string>) => Promise<void>
  onSkip: () => void
}

export function EntryQuestionsDialog({
  isOpen,
  stepName,
  stepDescription,
  questions,
  onSubmit,
  onSkip,
}: EntryQuestionsDialogProps) {
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    Object.fromEntries(questions.map((_, i) => [i, ""]))
  )
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(answers)
    } finally {
      setIsLoading(false)
    }
  }

  const answeredCount = Object.values(answers).filter((a) => a.trim()).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="p-6 pb-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{stepName}</h2>
          {stepDescription && (
            <p className="text-sm text-muted-foreground mt-1">{stepDescription}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {questions.map((question, i) => (
              <div key={i}>
                <label className="block text-sm font-medium mb-1">{question}</label>
                <textarea
                  value={answers[i] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Your answer..."
                />
              </div>
            ))}
          </div>

          <div className="p-6 pt-4 border-t border-border flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground">
              {answeredCount} of {questions.length} answered
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
              <Button type="submit" disabled={isLoading || answeredCount === 0}>
                {isLoading ? "Saving..." : "Save to Context"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

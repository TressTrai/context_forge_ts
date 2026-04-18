/**
 * Projects list page - Browse and manage projects.
 */

import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { EntryQuestionsDialog } from "@/components/EntryQuestionsDialog"
import type { Id } from "../../../convex/_generated/dataModel"

// Format relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Create project dialog
function CreateProjectDialog({
  isOpen,
  onClose,
  onStarted,
}: {
  isOpen: boolean
  onClose: () => void
  onStarted: (projectId: Id<"projects">, sessionId: Id<"sessions"> | null, entryQuestions: string[], stepName: string) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const createProject = useMutation(api.projects.create)
  const startProject = useMutation(api.workflows.startProject)
  const workflows = useQuery(api.workflows.list)

  const reset = () => {
    setName("")
    setDescription("")
    setSelectedWorkflowId("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (selectedWorkflowId) {
        const wf = workflows?.find((w) => w._id === selectedWorkflowId)
        const result = await startProject({
          workflowId: selectedWorkflowId as Id<"workflows">,
          projectName: name.trim(),
          projectDescription: description.trim() || undefined,
        })
        reset()
        onClose()
        onStarted(result.projectId, result.sessionId, result.entryQuestions, wf?.steps[0]?.name ?? "Step 1", wf?.steps[0]?.description)
      } else {
        const result = await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
        })
        reset()
        onClose()
        onStarted(result as Id<"projects">, null, [], "")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const availableWorkflows = workflows?.filter((w) => w.steps.length > 0) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Project</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Game Design Project"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="project-description" className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {availableWorkflows.length > 0 && (
            <div>
              <label htmlFor="project-workflow" className="block text-sm font-medium mb-1">
                Workflow (optional)
              </label>
              <select
                id="project-workflow"
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No workflow — blank project</option>
                {availableWorkflows.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.steps.length} step{w.steps.length !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
              {selectedWorkflowId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Project will start at step 1 of the selected workflow.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? "Creating..." : selectedWorkflowId ? "Start Workflow" : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Project card component
function ProjectCard({
  project,
  onDelete,
}: {
  project: {
    _id: Id<"projects">
    name: string
    description?: string
    currentStep?: number
    createdAt: number
    updatedAt: number
    sessionCount: number
  }
  onDelete: () => void
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            to="/app/projects/$projectId"
            params={{ projectId: project._id }}
            className="font-semibold text-lg truncate hover:underline"
          >
            {project.name}
          </Link>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTimeAgo(project.updatedAt)}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-1 rounded-md bg-muted">
          {project.sessionCount} session{project.sessionCount !== 1 ? "s" : ""}
        </span>
        {project.currentStep !== undefined && (
          <span className="text-xs px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            Step {project.currentStep}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-border flex gap-2">
        <Link to="/app/projects/$projectId" params={{ projectId: project._id }}>
          <Button variant="outline" size="sm">
            Open
          </Button>
        </Link>
        {showConfirmDelete ? (
          <>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Confirm Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmDelete(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirmDelete(true)}
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}

// Main projects page
function ProjectsIndexPage() {
  const projects = useQuery(api.projects.list)
  const removeProject = useMutation(api.projects.remove)
  const createBlock = useMutation(api.blocks.create)
  const navigate = useNavigate()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [pendingEntry, setPendingEntry] = useState<{
    projectId: Id<"projects">
    sessionId: Id<"sessions">
    stepName: string
    stepDescription?: string
    questions: string[]
  } | null>(null)

  const handleDelete = async (id: Id<"projects">) => {
    await removeProject({ id })
  }

  const handleStarted = (
    projectId: Id<"projects">,
    sessionId: Id<"sessions"> | null,
    entryQuestions: string[],
    stepName: string,
    stepDescription?: string
  ) => {
    if (sessionId && entryQuestions.length > 0) {
      setPendingEntry({ projectId, sessionId, stepName, stepDescription, questions: entryQuestions })
    } else {
      navigate({ to: "/app/projects/$projectId", params: { projectId } })
    }
  }

  const handleEntrySubmit = async (answers: Record<number, string>) => {
    if (!pendingEntry) return
    const { projectId, sessionId, questions } = pendingEntry
    const lines = questions
      .map((q, i) => ({ q, a: answers[i]?.trim() }))
      .filter(({ a }) => a)
      .map(({ q, a }) => `**${q}**\n${a}`)
    if (lines.length > 0) {
      await createBlock({
        sessionId,
        content: lines.join("\n\n"),
        type: "entry_brief",
        zone: "STABLE",
      })
    }
    setPendingEntry(null)
    navigate({ to: "/app/projects/$projectId", params: { projectId } })
  }

  const handleEntrySkip = () => {
    if (!pendingEntry) return
    const { projectId } = pendingEntry
    setPendingEntry(null)
    navigate({ to: "/app/projects/$projectId", params: { projectId } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Organize related sessions into projects
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          + New Project
        </Button>
      </div>

      {projects === undefined ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a project to organize your sessions and track workflow progress.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onDelete={() => handleDelete(project._id)}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onStarted={handleStarted}
      />

      {pendingEntry && (
        <EntryQuestionsDialog
          isOpen={true}
          stepName={pendingEntry.stepName}
          stepDescription={pendingEntry.stepDescription}
          questions={pendingEntry.questions}
          onSubmit={handleEntrySubmit}
          onSkip={handleEntrySkip}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute("/app/projects/")({
  component: ProjectsIndexPage,
})

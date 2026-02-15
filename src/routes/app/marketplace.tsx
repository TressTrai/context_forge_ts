/**
 * Marketplace browse page - search, filter, and import community templates and workflows.
 */

import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download } from "lucide-react"
import { useToast } from "@/components/ui/toast"

function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [selectedType, setSelectedType] = useState<
    "template" | "workflow" | undefined
  >()

  const categories = useQuery(api.marketplace.listCategories)
  const results = useQuery(api.marketplace.search, {
    searchTerm: debouncedSearch || undefined,
    category: selectedCategory,
    type: selectedType,
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse and import community templates and workflows
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates and workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !selectedCategory
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:border-foreground/30"
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat._id}
            onClick={() =>
              setSelectedCategory(
                selectedCategory === cat.slug ? undefined : cat.slug,
              )
            }
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              selectedCategory === cat.slug
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {([undefined, "template", "workflow"] as const).map((type) => (
          <button
            key={type ?? "all"}
            onClick={() => setSelectedType(type)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              selectedType === type
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            {type === "template"
              ? "Templates"
              : type === "workflow"
                ? "Workflows"
                : "All Types"}
          </button>
        ))}
      </div>

      {/* Results */}
      {results === undefined ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Loading...
        </p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {searchTerm ? "No results found" : "No items published yet"}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((item) => (
            <MarketplaceCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function MarketplaceCard({ item }: { item: Doc<"marketplace"> }) {
  const importTemplate = useMutation(api.marketplace.importTemplate)
  const importWorkflow = useMutation(api.marketplace.importWorkflow)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    setImporting(true)
    try {
      if (item.type === "template") {
        await importTemplate({ id: item._id })
        toast.success(
          "Imported",
          `Template "${item.name}" added to your library`,
        )
        navigate({ to: "/app/templates" })
      } else {
        await importWorkflow({ id: item._id })
        toast.success(
          "Imported",
          `Workflow "${item.name}" added to your library`,
        )
        navigate({ to: "/app/workflows" })
      }
    } catch (err) {
      toast.error("Import failed", String(err))
    } finally {
      setImporting(false)
    }
  }

  // Count info for display
  const stepCount = item.workflowSteps?.length
  const blockCount = item.templateBlocks?.length

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            item.type === "template"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
          }`}
        >
          {item.type === "template" ? "Template" : "Workflow"}
        </span>
        <span className="text-xs text-muted-foreground">{item.category}</span>
      </div>
      <div>
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {item.description}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          by {item.authorName}
          {" · "}
          {item.importCount} {item.importCount === 1 ? "import" : "imports"}
          {stepCount ? ` · ${stepCount} steps` : ""}
          {blockCount ? ` · ${blockCount} blocks` : ""}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleImport}
          disabled={importing}
          className="text-xs h-7"
        >
          <Download className="w-3 h-3 mr-1" />
          {importing ? "..." : "Import"}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/app/marketplace")({
  component: MarketplacePage,
})

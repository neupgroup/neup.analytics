"use client"

import { useCallback, type MouseEvent } from "react"

import { useToast } from "#/core/hooks/useToast"

export function useProjectNavigationGuard(projectId: string | null) {
  const { toast } = useToast()

  return useCallback((event: MouseEvent<HTMLElement>, sectionName = 'this section') => {
    if (projectId) return

    event.preventDefault()
    toast({
      name: "missing_project_navigation",
      state: "warning",
      autoDismiss: false,
      title: "Select a project first",
      description: `Choose a project before opening ${sectionName} section.`,
    })
  }, [projectId, toast])
}

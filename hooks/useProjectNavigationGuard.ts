"use client"

import { useCallback, type MouseEvent } from "react"
import { useToast } from '@neup/core/hooks/useToast'

export function useProjectNavigationGuard(projectId: string | null) {
  const { toast } = useToast()

  return useCallback((event: MouseEvent<HTMLElement>, sectionName = 'this section') => {
    if (projectId) return

    event.preventDefault()
    toast({
      name: 'openPage.project.notSelected',
      state: 'info',
      autoDismiss: 10,
      title: 'Project not selected',
      description: `Please select a project to open ${sectionName}`,
    })
  }, [projectId, toast])
}

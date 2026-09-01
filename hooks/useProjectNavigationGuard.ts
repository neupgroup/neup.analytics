"use client"

import { useCallback, type MouseEvent } from "react"
import { useRouter } from "next/navigation"

export function useProjectNavigationGuard(projectId: string | null) {
  const router = useRouter()

  return useCallback((event: MouseEvent<HTMLElement>, _sectionName = 'this section') => {
    if (projectId) return

    event.preventDefault()
    router.push('/projects')
  }, [projectId, router])
}
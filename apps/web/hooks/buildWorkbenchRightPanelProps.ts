import type { ComponentProps } from 'react'
import type { WorkbenchRightPanel } from '@/components/workbench/WorkbenchRightPanel'

type WorkbenchRightPanelProps = ComponentProps<typeof WorkbenchRightPanel>

export function buildWorkbenchRightPanelProps(
  props: WorkbenchRightPanelProps
): WorkbenchRightPanelProps {
  return props
}

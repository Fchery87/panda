'use client'

/**
 * Central Phosphor Icons mapping for Panda.ai
 * Replaces lucide-react with Phosphor duotone icons
 *
 * Weight conventions:
 * - duotone: navigation/sidebar, file tabs, major UI elements
 * - regular: inline/small icons, separators
 * - fill: active states, send button, stop button
 * - bold: emphasis (rarely used)
 * - light: subtle accents (rarely used)
 */

import {
  TreeStructure,
  MagnifyingGlass,
  ClockCounterClockwise,
  CheckSquareOffset,
  GitBranch,
  Terminal,
  GearSix,
  BookOpenText,
  Plus,
  PaperPlaneRight,
  Stop,
  Sparkle,
  ArrowCounterClockwise,
  Robot,
  DotsThreeOutline,
  ChatCircle,
  FileCode,
  WifiHigh,
  WifiSlash,
  CircleNotch,
  FileTs,
  FileJs,
  FileCss,
  FileHtml,
  FileText,
  X,
  CaretRight,
  Play,
  ListChecks,
  Cube,
  Brain,
  ChartBar,
  Folder,
  CaretLeft,
  CaretDown,
  CaretUp,
  Check,
  XCircle,
  Warning,
  Info,
  Copy,
  Trash,
  Pencil,
  Eye,
  EyeSlash,
  Lock,
  LockKeyOpen,
  Download,
  Upload,
  ShareNetwork,
  Link,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Square,
  DotsThree,
  DotsThreeVertical,
  List,
  Rows,
  SquaresFour,
  GridFour,
  Layout,
  Sidebar,
  SidebarSimple,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextT,
  Highlighter,
  Code,
  BracketsCurly,
  BracketsAngle,
  BracketsRound,
  BracketsSquare,
  Quotes,
  Asterisk,
  Hash,
  At,
  CaretUpDown,
  ArrowsHorizontal,
  ArrowsVertical,
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  House,
  FolderSimple,
  Globe,
  Bell,
  CloudArrowUp,
  Lightning,
  Pulse,
  ArrowsClockwise,
  Pause,
  GitDiff,
  Browser,
  type IconProps,
} from '@phosphor-icons/react'

// Re-export types
export type { IconProps }

// ============================================
// SIDEBAR RAIL ICONS
// ============================================
export {
  TreeStructure as IconExplorer,
  MagnifyingGlass as IconSearch,
  ClockCounterClockwise as IconHistory,
  CheckSquareOffset as IconSpecs,
  GitBranch as IconGit,
  Terminal as IconTerminal,
  GearSix as IconSettings,
  BookOpenText as IconDocs,
  House as IconHome,
  FolderSimple as IconProjects,
  Robot as IconAgents,
  Globe as IconDeploy,
}

// ============================================
// TOP BAR / WORKSPACE ICONS
// ============================================
export {
  Bell as IconBell,
  CloudArrowUp as IconCloud,
  Lightning as IconQuickAction,
  Pulse as IconHealth,
  ArrowsClockwise as IconRefresh,
  Pause as IconPause,
  GitDiff as IconDiff,
  Browser as IconBrowser,
}

// ============================================
// CHAT INPUT ICONS
// ============================================
export {
  Plus as IconAttach,
  PaperPlaneRight as IconSend,
  Stop as IconStop,
  Sparkle as IconEnhance,
  ArrowCounterClockwise as IconRevert,
}

// ============================================
// CHAT HEADER ICONS
// ============================================
export { Robot as IconBot, DotsThreeOutline as IconOverflow, ChatCircle as IconNewChat }

// ============================================
// STATUS BAR ICONS
// ============================================
export {
  FileCode as IconFile,
  WifiHigh as IconConnected,
  WifiSlash as IconDisconnected,
  CircleNotch as IconStreaming,
}

// ============================================
// FILE TAB ICONS
// ============================================
export {
  FileTs as IconFileTs,
  FileJs as IconFileJs,
  FileCode as IconFileJson,
  FileCss as IconFileCss,
  FileHtml as IconFileHtml,
  FileText as IconFileMarkdown,
  X as IconClose,
}

// Get file icon by extension - returns the component reference
export function getFileIcon(extension: string | null | undefined) {
  const ext = extension?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return FileTs
    case 'js':
    case 'jsx':
      return FileJs
    case 'json':
      return FileCode
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return FileCss
    case 'html':
    case 'htm':
      return FileHtml
    case 'md':
    case 'markdown':
      return FileText
    default:
      return FileCode
  }
}

// ============================================
// BREADCRUMB ICONS
// ============================================
export { CaretRight as IconBreadcrumbSeparator, Folder as IconFolder }

// ============================================
// INSPECTOR TAB ICONS
// ============================================
export {
  Play as IconRunTab,
  ListChecks as IconPlanTab,
  Cube as IconArtifactsTab,
  Brain as IconMemoryTab,
  ChartBar as IconEvalsTab,
}

// ============================================
// NAVIGATION ICONS
// ============================================
export {
  CaretLeft as IconChevronLeft,
  CaretRight as IconChevronRight,
  CaretDown as IconChevronDown,
  CaretUp as IconChevronUp,
  CaretUpDown as IconChevronUpDown,
  ArrowLeft as IconArrowLeft,
  ArrowRight as IconArrowRight,
  ArrowUp as IconArrowUp,
  ArrowDown as IconArrowDown,
}

// ============================================
// UTILITY ICONS
// ============================================
export {
  Check as IconCheck,
  X as IconX,
  XCircle as IconError,
  Warning as IconWarning,
  Info as IconInfo,
  Copy as IconCopy,
  Trash as IconTrash,
  Pencil as IconEdit,
  Eye as IconEye,
  EyeSlash as IconEyeOff,
  Lock as IconLock,
  LockKeyOpen as IconUnlock,
  Download as IconDownload,
  Upload as IconUpload,
  ShareNetwork as IconShare,
  Link as IconLink,
  Minus as IconMinus,
  Square as IconSquare,
  DotsThree as IconMoreHorizontal,
  DotsThreeVertical as IconMoreVertical,
  List as IconList,
  Rows as IconRows,
  SquaresFour as IconGrid,
  GridFour as IconGridFour,
  Layout as IconLayout,
  Sidebar as IconSidebar,
  SidebarSimple as IconSidebarSimple,
}

// ============================================
// TEXT EDITOR ICONS
// ============================================
export {
  TextAlignLeft as IconAlignLeft,
  TextAlignCenter as IconAlignCenter,
  TextAlignRight as IconAlignRight,
  TextT as IconText,
  Highlighter as IconHighlight,
  Code as IconCode,
  BracketsCurly as IconBracketsCurly,
  BracketsAngle as IconBracketsAngle,
  BracketsRound as IconBracketsRound,
  BracketsSquare as IconBracketsSquare,
  Quotes as IconQuotes,
  Asterisk as IconAsterisk,
  Hash as IconHash,
  At as IconAt,
}

// ============================================
// RESIZE / LAYOUT ICONS
// ============================================
export {
  ArrowsHorizontal as IconResizeHorizontal,
  ArrowsVertical as IconResizeVertical,
  ArrowsInLineHorizontal as IconCollapse,
  ArrowsOutLineHorizontal as IconExpand,
}

// ============================================
// LOADING / SPINNER
// ============================================
export { CircleNotch as IconSpinner }

// ============================================
// GENERIC FILE ICON
// ============================================
export { FileCode as IconFileCode }

// Legacy lucide-react compatibility exports
// These allow gradual migration - existing code importing from lucide-react
// can be updated to import from @/components/ui/icons instead

/** @deprecated Use IconExplorer instead */
export { TreeStructure as FolderTree }
/** @deprecated Use IconSearch instead */
export { MagnifyingGlass as Search }
/** @deprecated Use IconHistory instead */
export { ClockCounterClockwise as Clock }
/** @deprecated Use IconSpecs instead */
export { CheckSquareOffset as FileCheck }
/** @deprecated Use IconSettings instead */
export { GearSix as Settings }
/** @deprecated Use IconDocs instead */
export { BookOpenText as BookOpen }
/** @deprecated Use IconSend instead */
export { PaperPlaneRight as Send }
/** @deprecated Use IconStop instead */
export { Stop as Square }
/** @deprecated Use IconEnhance instead */
export { Sparkle as Sparkles }
/** @deprecated Use IconRevert instead */
export { ArrowCounterClockwise as Undo2 }
/** @deprecated Use IconBot instead */
export { Robot as Bot }
/** @deprecated Use IconOverflow instead */
export { DotsThreeOutline as MoreHorizontal }
/** @deprecated Use IconNewChat instead */
export { ChatCircle as MessageSquarePlus }
/** @deprecated Use IconFile instead */
export { FileCode as FileCode2 }
/** @deprecated Use IconConnected instead */
export { WifiHigh as Wifi }
/** @deprecated Use IconDisconnected instead */
export { WifiSlash as WifiOff }
/** @deprecated Use IconClose instead */
export { X }

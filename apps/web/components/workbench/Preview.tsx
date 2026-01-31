"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PreviewProps {
  url?: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

export function Preview({ url }: PreviewProps) {
  const [device, setDevice] = React.useState<DeviceType>("desktop");
  const [isLoading, setIsLoading] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    if (iframeRef.current && url) {
      setIsLoading(true);
      iframeRef.current.src = url;
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const deviceSizes = {
    desktop: { width: "100%", maxWidth: "none" },
    tablet: { width: "768px", maxWidth: "100%" },
    mobile: { width: "375px", maxWidth: "100%" },
  };

  const DeviceButton: React.FC<{
    type: DeviceType;
    icon: React.ReactNode;
    label: string;
  }> = ({ type, icon, label }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            device === type
              ? "bg-primary/20 text-primary"
              : "text-zinc-400 hover:text-zinc-300"
          )}
          onClick={() => setDevice(type)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
        {/* Preview Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Eye className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-300">Preview</span>
            {url && (
              <span className="text-xs text-zinc-500 truncate max-w-[150px]">
                {new URL(url).hostname}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Device toggle buttons */}
            <div className="flex items-center gap-0.5 bg-zinc-950/50 rounded-md p-0.5">
              <DeviceButton
                type="desktop"
                icon={<Monitor className="w-4 h-4" />}
                label="Desktop"
              />
              <DeviceButton
                type="tablet"
                icon={<Tablet className="w-4 h-4" />}
                label="Tablet"
              />
              <DeviceButton
                type="mobile"
                icon={<Smartphone className="w-4 h-4" />}
                label="Mobile"
              />
            </div>

            <div className="w-px h-4 bg-zinc-700 mx-2" />

            {/* Action buttons */}
            {url && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-300"
                      onClick={handleRefresh}
                    >
                      <RefreshCw
                        className={cn("w-4 h-4", isLoading && "animate-spin")}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-300"
                      onClick={() =>
                        url && window.open(url, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in new tab</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-300"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Full screen</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-zinc-950 overflow-auto">
          <div className="h-full flex items-center justify-center p-4">
            <motion.div
              key={device}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "h-full transition-all duration-300 ease-out",
                device !== "desktop" && "shadow-2xl shadow-black/50"
              )}
              style={{
                width: deviceSizes[device].width,
                maxWidth: deviceSizes[device].maxWidth,
              }}
            >
              {url ? (
                <iframe
                  ref={iframeRef}
                  src={url}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  title="Preview"
                  onLoad={() => setIsLoading(false)}
                />
              ) : (
                <PlaceholderState />
              )}
            </motion.div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            {url ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-400">Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span className="text-xs text-zinc-500">No preview URL</span>
              </>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {device.charAt(0).toUpperCase() + device.slice(1)} view
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Placeholder state when no URL is provided
function PlaceholderState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="h-full w-full flex flex-col items-center justify-center bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-lg"
    >
      <div className="relative">
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="relative w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
          <Eye className="w-8 h-8 text-zinc-500" />
        </div>
      </div>

      <h3 className="mt-6 text-lg font-semibold text-zinc-400">
        No Preview Available
      </h3>
      <p className="mt-2 text-sm text-zinc-500 text-center max-w-xs">
        Deploy your project to see a live preview here, or connect an external
        URL.
      </p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex items-center gap-2 text-xs text-zinc-600"
      >
        <span className="px-2 py-1 bg-zinc-800 rounded">Deploy</span>
        <span>→</span>
        <span className="px-2 py-1 bg-zinc-800 rounded">Preview</span>
      </motion.div>
    </motion.div>
  );
}

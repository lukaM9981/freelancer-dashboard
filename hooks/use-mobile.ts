import * as React from "react"

// Matches Tailwind's `lg` (1024px): the sidebar is a sheet below that (Design.md §3.8).
const MOBILE_QUERY = "(max-width: 1023px)"

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

/** Server render matches the first client paint; CSS shows the sidebar from `lg`. */
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

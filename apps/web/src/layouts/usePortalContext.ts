import { useOutletContext } from 'react-router'
import type { PortalOutletContext } from './PortalLayout'

export const usePortalContext = () => useOutletContext<PortalOutletContext>()

import { create } from 'zustand'
import type { ServiceType } from './ServiceNode'

type MuseumMarkersState = {
  /**
   * Service type the map-editor toolbar last asked the panel to show. `null`
   * lists every service. Kept in a tiny store because the toolbar
   * (`sceneOverlay`) and the panel (`sidebarTabs`) are mounted as siblings by
   * the Pascal editor and cannot share React state directly.
   */
  selectedService: ServiceType | null
  selectService: (service: ServiceType | null) => void
}

export const useMuseumMarkersStore = create<MuseumMarkersState>((set) => ({
  selectedService: null,
  selectService: (selectedService) => set({ selectedService }),
}))

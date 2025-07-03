import { create } from 'zustand';

interface EphemeralSettingsStore {
  isWebSearch: boolean;
  setIsWebSearch: (isWebSearch: boolean) => void;

  isImageGeneration: boolean;
  setIsImageGeneration: (isImageGeneration: boolean) => void;

  threadSearchFilter: string;
  setThreadSearchFilter: (threadSearchFilter: string) => void;

  openUpgradeDropdown: string | null;
  setOpenUpgradeDropdown: (dropdownId: string | null) => void;
}

const useEphemeralSettings = create<EphemeralSettingsStore>((set) => ({
  isWebSearch: false,
  setIsWebSearch: (isWebSearch: boolean) => set({ isWebSearch }),

  isImageGeneration: false,
  setIsImageGeneration: (isImageGeneration: boolean) => set({ isImageGeneration }),

  threadSearchFilter: "",
  setThreadSearchFilter: (threadSearchFilter: string) => set({ threadSearchFilter }),

  openUpgradeDropdown: null,
  setOpenUpgradeDropdown: (dropdownId: string | null) => set({ openUpgradeDropdown: dropdownId }),
}));

export default useEphemeralSettings;
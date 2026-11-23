import { createContext, useContext } from "react";

// Keep context identity stable when the provider is replaced by Vite Fast Refresh.
export const WorkshopContext = createContext(null);
export const useWorkshop = () => useContext(WorkshopContext);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { KitchenProvider } from "./context/KitchenContext.jsx";
import { VirtualReceiptProvider } from "./context/virtualReceiptContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VirtualReceiptProvider>
      <KitchenProvider>
        <App />
      </KitchenProvider>
    </VirtualReceiptProvider>
  </StrictMode>,
);

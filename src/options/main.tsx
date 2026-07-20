import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../shared/page.css";

export function OptionsApp(): React.JSX.Element {
  return (
    <main>
      <h1>FloatRead 设置</h1>
      <p>Provider、阅读行为、皮肤与隐私设置将在对应 Phase 中接入。</p>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OptionsApp />
    </StrictMode>,
  );
}

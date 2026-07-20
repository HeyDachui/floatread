import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../shared/page.css";

export function OnboardingApp(): React.JSX.Element {
  return (
    <main>
      <h1>欢迎使用 FloatRead</h1>
      <p>只有在你主动操作后，所选文字才会发送给你配置的 AI Provider。</p>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OnboardingApp />
    </StrictMode>,
  );
}

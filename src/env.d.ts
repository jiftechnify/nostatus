/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

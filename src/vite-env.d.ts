/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_ID: string;
  readonly VITE_SONGDATA_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

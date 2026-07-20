export interface ManifestV3 {
  manifest_version: 3;
  name: string;
  description: string;
  version: string;
  default_locale: string;
  minimum_chrome_version: string;
  permissions: string[];
  optional_host_permissions: string[];
  background: {
    service_worker: string;
    type: "module";
  };
  content_scripts: Array<{
    matches: string[];
    js: string[];
    run_at: "document_idle";
    all_frames: false;
  }>;
  action: {
    default_popup: string;
    default_title: string;
  };
  options_page: string;
  commands: Record<
    string,
    {
      description: string;
      suggested_key?: { default: string };
    }
  >;
  content_security_policy: {
    extension_pages: string;
  };
}

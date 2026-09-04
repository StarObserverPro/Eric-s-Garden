declare module "node:fs" {
  export function mkdirSync(path: string, options?: { readonly recursive?: boolean }): string | undefined;
  export function readFileSync(path: string | URL, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: Uint8Array): void;
}

declare module "node:path" {
  export function dirname(path: string): string;
}

declare const process: {
  readonly env: Readonly<Record<string, string | undefined>>;
};

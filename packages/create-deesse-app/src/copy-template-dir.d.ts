declare module 'copy-template-dir' {
  function copy(
    templateDir: string,
    targetDir: string,
    vars: Record<string, string>,
    callback: (err: Error | null, createdFiles: string[]) => void
  ): void;

  export = copy;
}

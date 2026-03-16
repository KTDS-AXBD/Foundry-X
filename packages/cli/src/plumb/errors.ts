export abstract class FoundryXError extends Error {
  abstract readonly code: string;
  abstract readonly exitCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PlumbNotInstalledError extends FoundryXError {
  readonly code = 'PLUMB_NOT_INSTALLED' as const;
  readonly exitCode = 1;

  constructor() {
    super('Plumb is not installed. Run: pip install plumb-dev');
  }
}

export class PlumbTimeoutError extends FoundryXError {
  readonly code = 'PLUMB_TIMEOUT' as const;
  readonly exitCode = 1;

  constructor(timeoutMs: number) {
    super(
      `Plumb timed out after ${timeoutMs}ms. Try: FOUNDRY_X_PLUMB_TIMEOUT=${timeoutMs * 2}`,
    );
  }
}

export class PlumbExecutionError extends FoundryXError {
  readonly code = 'PLUMB_EXECUTION_ERROR' as const;
  readonly exitCode = 1;

  constructor(public readonly stderr: string) {
    super(`Plumb execution failed: ${stderr}`);
  }
}

export class PlumbOutputError extends FoundryXError {
  readonly code = 'PLUMB_OUTPUT_ERROR' as const;
  readonly exitCode = 1;

  constructor() {
    super('Unexpected Plumb output. Check plumb version.');
  }
}

export class NotInitializedError extends FoundryXError {
  readonly code = 'NOT_INITIALIZED' as const;
  readonly exitCode = 1;

  constructor() {
    super("Foundry-X is not initialized. Run 'foundry-x init' first.");
  }
}

export class NotGitRepoError extends FoundryXError {
  readonly code = 'NOT_GIT_REPO' as const;
  readonly exitCode = 1;

  constructor() {
    super("Not a git repository. Run 'git init' first.");
  }
}

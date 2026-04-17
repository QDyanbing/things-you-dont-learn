export interface FileCoordinatorOptions {}

export class FileCoordinator {
  private readonly file: File;
  private readonly options: FileCoordinatorOptions;

  constructor(
    file: File,
    options: FileCoordinatorOptions = {},
  ) {
    this.file = file;
    this.options = options;
  }

  getFile() {
    return this.file;
  }

  getOptions() {
    return { ...this.options };
  }
}

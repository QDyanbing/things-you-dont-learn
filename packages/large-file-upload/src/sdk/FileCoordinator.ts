export interface FileCoordinatorOptions {}

export class FileCoordinator {
  constructor(
    readonly file: File,
    readonly options: FileCoordinatorOptions = {}
  ) {}
}

import type { IModificationProgressManager } from "../types.ts";

/**
 * Adapter to provide modification progress tracking functionality
 */
export class ModificationProgressManagerAdapter
  implements IModificationProgressManager
{
  private setIsModifyingFn: (isModifying: boolean) => void;
  private setModifyEntityFn: (entity: any) => void;

  constructor(
    setIsModifyingFn: (isModifying: boolean) => void,
    setModifyEntityFn: (entity: any) => void,
  ) {
    this.setIsModifyingFn = setIsModifyingFn;
    this.setModifyEntityFn = setModifyEntityFn;
  }

  setIsModifying(isModifying: boolean): void {
    this.setIsModifyingFn(isModifying);
  }

  setModifyEntity(entity: any): void {
    this.setModifyEntityFn(entity);
  }

  /**
   * Create adapter from Redux dispatch functions
   */
  static fromReduxDispatch(
    setIsModifyingDispatch: (isModifying: boolean) => void,
    setModifyEntityDispatch: (entity: any) => void,
  ): ModificationProgressManagerAdapter {
    return new ModificationProgressManagerAdapter(
      setIsModifyingDispatch,
      setModifyEntityDispatch,
    );
  }
}

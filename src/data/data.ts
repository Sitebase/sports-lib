import {DataInterface, UnitSystem} from './data.interface';
import {DataJSONInterface} from './data.json.interface';
import {DataPositionInterface} from './data.position.interface';

export abstract class Data implements DataInterface {
  static type: string; // @todo perhas add enum type
  static unit: string;
  static displayType?: string;
  static unitSystem = UnitSystem.Metric;
  protected value: number | string | boolean | string[] | DataPositionInterface;

  protected constructor(value: string | number | boolean | string[] | DataPositionInterface) {
    if (!this.getType()) {
      throw new Error('Type not set');
    }
    if ((typeof value !== 'string') && (typeof value !== 'number') && (typeof value !== 'boolean') && !Array.isArray(value)) {
      throw new Error('Value is not boolean or number or string');
    }
    this.value = value;
  }

  setValue(value: string | number | boolean| string[]| DataPositionInterface): this {
    this.value = value;
    return this;
  }

  getValue(formatForDataType?: string): string | number | boolean | string[]| DataPositionInterface {
    return this.value;
  }

  getDisplayValue(): number | string | string[] {
    const value = this.getValue();
    switch (typeof value) {
      case 'string':
      case 'number':
        return value;
      default:
        return String(value);
    }
  }

  getType(): string {
    return (<typeof Data>this.constructor).type;
  }

  getUnit(): string {
    return (<typeof Data>this.constructor).unit;
  }

  getDisplayUnit(): string {
    return this.getUnit();
  }

  getDisplayType(): string {
    return (<typeof Data>this.constructor).displayType || (<typeof Data>this.constructor).type;
  }

  getUnitSystem(): UnitSystem {
    return (<typeof Data>this.constructor).unitSystem;
  }

  toJSON(): DataJSONInterface {
    return {
      [this.getType()]: this.getValue(),
    };
  }
}

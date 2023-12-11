import { bytes } from './bytes';

export class DynamoDbItemSizer {
  /**
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypeDescriptors
   */
  ddbDataTypeKeys = ['S', 'N', 'B', 'BOOL', 'NULL', 'M', 'L', 'SS', 'NS', 'BS'];

  /**
   * @description Gets the approximate byte size for a DynamoDB input.
   * @example
   * ```
   * import { DynamoDbItemSizer } from 'ddbitemsizer';
   *
   * const itemSizer = new DynamoDbItemSizer();
   *
   * itemSize.get({
   *   key: {
   *     S: 'Hello World'
   *   }
   * });
   *```
   */
  public get(object: Record<string, any>) {
    if (!object) throw new MissingInputError();
    const entries: [string, any][] = Object.entries(object);

    return (
      entries.reduce((total: number, current: string[]) => {
        const [key, value] = current;
        return total + bytes(key) + this.bytesForValue(value);
      }, 0) || 0
    );
  }

  private bytesForValue(val: any) {
    const { innerKey, value } = this.getStructure(val);
    const type = this.getType(value, innerKey);
    return this.getSize(value, type);
  }

  ////////////////////////////
  // Input handling section //
  ////////////////////////////

  /**
   * @description Check if this a nested, DynamoDB-style object with a data-typed key.
   */
  private getStructure(value: any) {
    const isObject = this.isValueAnObject(value);
    const innerKey = Object.keys(value)[0] as any;
    const fixedValue = isObject ? value[innerKey] : value;

    return {
      innerKey,
      value: fixedValue
    };
  }

  private isValueAnObject(value: string | number | Record<string, any>) {
    return this.isKeyReserved(Object.keys(value));
  }

  private isKeyReserved(keys: any[]) {
    return keys.length === 1 && this.ddbDataTypeKeys.includes(keys[0]);
  }

  ///////////////////////////
  // Type handling section //
  ///////////////////////////

  /**
   * @description Get a cleaned type for the input key.
   */
  // eslint-disable-next-line complexity
  private getType(val: unknown, innerKey: string): DynamoDbType {
    if (innerKey === 'NULL' && this.isNull(val)) return 'null';

    if (this.isSet(val)) {
      if (innerKey === 'SS' && this.isSet(val)) return 'stringset';
      else if (innerKey === 'NS' && this.isSet(val)) return 'numberset';
      else if (innerKey === 'BS' && this.isSet(val)) return 'binaryset';
      else if (innerKey === 'L' && this.isSet(val)) return 'list';
    } else {
      if (innerKey === 'M') return 'map';
      else if (this.isNumber(val)) return 'number';
      else if (this.isString(val)) return 'string';
      else if (this.isBinary(val)) return 'binary';
      else if (this.isBoolean(val)) return 'boolean';
    }

    throw new MissingTypeError();
  }

  private isString(val: unknown) {
    return typeof val === 'string';
  }

  private isNumber(val: unknown) {
    return !isNaN(val as number);
    //return new RegExp(/^-?[0-9]\d+$/).test(`${val}`); // Also checks for negative numbers
  }

  private isBinary(val: unknown) {
    return Buffer.isBuffer(val);
  }

  private isBoolean(val: unknown) {
    return typeof val === 'boolean';
  }

  private isNull(val: unknown) {
    return typeof val === 'boolean' || val === '';
  }

  private isSet(val: unknown) {
    return Array.isArray(val);
  }

  ///////////////////////////
  // Size handling section //
  ///////////////////////////

  /**
   * @description Get the size of the input.
   */
  // eslint-disable-next-line complexity
  private getSize(val: any, type: DynamoDbType): number {
    if (type === 'number') return this.numberSize(val);
    else if (type === 'string') return this.stringSize(val);
    else if (type === 'binary') return this.binarySize(val);
    else if (type === 'boolean') return this.booleanOrNullSize();
    else if (type === 'null') return this.booleanOrNullSize();
    else if (type === 'stringset') return this.setSize(val, this.stringSize);
    else if (type === 'numberset') return this.setSize(val, this.numberSize);
    else if (type === 'binaryset') return this.setSize(val, this.binarySize);
    else if (type === 'list') return this.listSetSize(val);
    else if (type === 'map') return this.mapSize(val);

    throw new Error(`Unable to get a size for type: "${type}" and value: ${val}`);
  }

  private stringSize(val: string) {
    return bytes(val);
  }

  private numberSize(val: string) {
    const fixedValue = removeTrailingZeroes(parseFloat(val)).toString();
    const result = fixedValue.match(/.{1,2}/g)?.length || 0;
    const extraBytes = parseFloat(val) > 0 ? 1 : 2;
    return result + extraBytes;
  }

  private binarySize(val: any) {
    return Buffer.from(val).byteLength;
  }

  private booleanOrNullSize() {
    return 1;
  }

  private setSize(val: string[], sizeFunction: any) {
    return val.reduce((total: number, current: string) => total + sizeFunction(current), 0);
  }

  private listSetSize(val: string[]) {
    return (
      val.reduce((total: number, current: string) => {
        const innerKey = Object.keys(current)[0] as any;
        return total + bytes(innerKey) + this.bytesForValue(current);
      }, 0) + 3 // This is, presumably, for the "L" attribute and the array brackets
    );
  }

  private mapSize(val: Record<string, any>[]) {
    const entries = Object.entries(val);

    const values = entries.map((entry: Record<string, any>) => {
      return entry.reduce((total: number, current: any) => {
        const innerKey = Object.keys(current)[0] as any;
        const keyBytes = isNaN(innerKey) ? this.bytesForValue(innerKey) : 0; // Add bytes if there is a valid inner key
        return total + this.bytesForValue(current) + keyBytes;
      }, 0);
    });

    return values.reduce((total: number, current: number) => total + current) + 3; // This is, presumably, for the "M" attribute and the array brackets
  }
}

// Needs to be broken out because of "this" getting confused when passing the size functions
const removeTrailingZeroes = (val: number) => parseFloat(val.toString().replace(/0+$/, ''));

type DynamoDbType =
  | 'string'
  | 'number'
  | 'binary'
  | 'boolean'
  | 'null'
  | 'map'
  | 'list'
  | 'stringset'
  | 'numberset'
  | 'binaryset';

/**
 * @description Used when missing input.
 */
class MissingInputError extends Error {
  constructor() {
    super();
    this.name = 'MissingInputError';
    const message = 'Missing input!';
    this.message = message;
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}

/**
 * @description Used when unable to match input to a DynamoDB data type.
 */
class MissingTypeError extends Error {
  constructor() {
    super();
    this.name = 'MissingTypeError';
    const message = 'No matching type!';
    this.message = message;
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}

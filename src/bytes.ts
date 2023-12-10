/**
 * @description Returns the number of UTF-8 bytes of a string.
 * @example
 * ```
 * const size = bytes('Hi!');
 * console.log('The size of the string was:', size); // 'The size of the string was: 3'
 * ```
 */
export function bytes(str: string) {
  return new Blob([str]).size;
}

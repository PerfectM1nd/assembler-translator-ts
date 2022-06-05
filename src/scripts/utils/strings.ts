export function getReversedWord(value: number) {
  return new Uint8Array([(value & 0xFF), ((value & 0xFF00) >> 8)])
}

export const stringToLength = (string: string, length: number) => {
  if (string.length < length) {
    const numberOfSpaces = length - string.length;
    return string + new Array(numberOfSpaces).join(' ')
  }
  return string;
}
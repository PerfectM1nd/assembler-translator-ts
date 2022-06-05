
export const translate = (textToTranslate: string) => {
  const lines = getSeparateLines(textToTranslate);
  lines.forEach((line) => {
    const command = getCommandName(line);
    switch (command) {
      case 'MOV':
        break;
      default:
        break;
    }
  })
  return '';
}

export const getSeparateLines = (textToTranslate: string) => {
  return textToTranslate.split(/\r?\n/g).filter(string => !!string.length);
}

export const getCommandName = (commandLine: string) => {
  return commandLine.split(/[\s,]+/)[0];
}

export const getFirstOperand = (commandLine: string) => {
  return commandLine.split(/[\s,]+/)[1];
}

export const getSecondOperand = (commandLine: string) => {
  return commandLine.split(/[\s,]+/)[2];
}
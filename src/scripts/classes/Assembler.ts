import {CommandKey} from './CommandKey';
import {Command} from './Command';
import {List} from '../utils/List';
import {CollectedCommand} from './CollectedCommand';
import {ValueOutOfRange} from './Exceptions';
import {CollectedOperand} from './CollectedOperand';
import {getReversedWord, stringToLength} from '../utils/strings';
import { Definition, ListingHexItem, NamesTableItem } from "../../interfaces";
import { Operand, Register, Type } from "../../enums";

export class Assembler {
  private directions: Map<string, Type>;
  private commands: Map<string, Command>;

  private namesTable: Map<string, NamesTableItem>;

  private errors: Record<number, string>;
  private warnings: Record<number, string>;

  private program: List<number>;

  constructor() {
    this.initializeTableCommands();
    this.initializeTableDirections();

    this.namesTable = new Map<string, NamesTableItem>();
    this.errors = {};
    this.warnings = {};
  }

  private initializeTableDirections() {
    const directionsMap = new Map<string, Type>();
    directionsMap.set('SEGMENT', Type.String);
    directionsMap.set('ORG', Type.Word);
    directionsMap.set('OFFSET', Type.Word);
    directionsMap.set('DW', Type.Word);
    directionsMap.set('ENDS', null);
    directionsMap.set('END', null);

    this.directions = directionsMap;
  }

  private initializeTableCommands() {
    const commandsMap = new Map<string, Command>();

    commandsMap.set(
      JSON.stringify(new CommandKey('MOV', Operand.Register, Operand.Register)),
      new Command(0x22, 1, true, 3, null, null),
    );
    commandsMap.set(
      JSON.stringify(new CommandKey('MOV', Operand.Register, Operand.Immediate)),
      new Command(0x63, null, true, 3, 0, null),
    );
    commandsMap.set(
      JSON.stringify(new CommandKey('MOV', Operand.Register, Operand.Address)),
      new Command(0x22, 1, true, 0, null, 6),
    );
    commandsMap.set(
      JSON.stringify(new CommandKey('MOV', Operand.Address, Operand.Register)),
      new Command(0x22, 0, true, 0, null, 6),
    );

    commandsMap.set(
      JSON.stringify(new CommandKey('SBB', Operand.Register, Operand.Register)),
      new Command(0x6, 1, true, 3, 0, null),
    );
    commandsMap.set(
      JSON.stringify(new CommandKey('SBB', Operand.Register, Operand.Immediate)),
      new Command(0x40, null, true, 3, 0, null),
    );
    commandsMap.set(
      JSON.stringify(new CommandKey('SBB', Operand.Register, Operand.Address)),
      new Command(0x6, 1, true, 0, null, 6),
    );
    commandsMap.set(
      JSON.stringify(new CommandKey('SBB', Operand.Address, Operand.Register)),
      new Command(0x6, 0, true, 0, null, 6),
    );

    commandsMap.set(
      JSON.stringify(new CommandKey('MUL', Operand.Register, null)),
      new Command(0x7B, null, true, 3, 4, null),
    );

    commandsMap.set(
      JSON.stringify(new CommandKey('JA', Operand.Displacement, null)),
      new Command(0x77, null, null, null, null, 0),
    );

    commandsMap.set(
      JSON.stringify(new CommandKey('INT', Operand.Immediate, null)),
      new Command(0xCD, null, null, null, null, null),
    );

    this.commands = commandsMap;
  }

  compile(source: string) {
    if (!source) {
      return null;
    }
    const commandsSet = new Set<string>(Array.from(this.commands.keys()).map(el => JSON.parse(el).name));
    const listingHex: ListingHexItem[] = [];
    const commandsToTranslate = <Record<number, CollectedCommand>>{};
    const definitions = <Record<number, Definition>>{};

    this.program = new List();

    let startAddressInstalled = false;
    let instructionPointerInstalled = false;
    let segmentStarted = false;
    let segmentsEnded = false;
    let segmentName = 'SEGMENT';

    let nextAddress = 0;
    let startAddress = 0;
    let instructionPointer = 0;
    let endIndex = 0;

    const codeLines = new Map<number, string>();

    const separatedCode = source.split(/\r?\n/g);

    for (let i = 0; i < separatedCode.length; i++) {
      codeLines.set(i + 1, separatedCode[i].trim());
      listingHex.push(null);
    }

    exit:
    for (const [key, value] of codeLines) {
      let line = value;
      if (!line) continue;

      const index = key;
      let nextIndex = line.indexOf(';');
      if (nextIndex === 0) {
        continue;
      } else if (nextIndex !== -1) {
        line = line.substring(0, nextIndex);
      }

      let command: string;
      nextIndex = line.indexOf(' ');
      if (nextIndex === -1) {
        command = line;
      } else {
        command = line.substring(0, nextIndex);
      }
      command = command.toUpperCase();

      if (!segmentStarted) {
        if (!this.directions.has(command) && !commandsSet.has(command)) {
          if (this.idIsValid(command)) {
            listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: null};
            if (nextIndex === -1 || !(line.substring(nextIndex, line.length).trim() === 'SEGMENT')) {
              this.errors[index] = 'Неизвестная инструкция (ожидалась SEGMENT)';
              continue;
            }
            segmentName = command;
            segmentStarted = true;
            continue;
          }
        } else {
          this.errors[index] = `Идентификатор сегмента может начинаться только с _, - или буквы: ${command}`;
          listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: null};
          segmentStarted = true;
          continue;
        }
      }

      if (this.directions.has(command)) {
        switch (command) {
          case 'ORG': {
            const number = line.substring(nextIndex, line.length).trim();
            if (number.charAt(number.length - 1) !== 'H') {
              let address: number;
              if (!isNaN(parseInt(number))) {
                address = parseInt(number);
              } else {
                this.errors[index] = `Неверное выражение ${number}`;
                break;
              }
              if (this.isValidType(address, this.directions.get(command))) {
                nextAddress = address;
              }
              break;
            }
            try {
              nextAddress = this.checkOperandType(number, this.directions.get(command));
            } catch (e) {
              if (e instanceof ValueOutOfRange) {
                this.errors[index] = e.message;
              }
            }
            break;
          }
          case 'OFFSET': {
            const number = line.substring(nextIndex, line.length).trim();
            try {
              nextAddress += this.checkOperandType(number, this.directions.get(command));
              if (nextAddress > 25565) {
                this.errors[index] =  'Значение СчАК превысило диапазон слова (25565)';
              }
            } catch (e) {
              if (e instanceof ValueOutOfRange) {
                this.errors[index] = e.message;
              }
            }
            break;
          }
          case 'END': {
            endIndex = index;
            break exit;
          }
          default: {
            this.errors[index] = `Неожиданная директива: ${command}`;
          }
        }
      } else if (commandsSet.has(command)) {
        if (!segmentStarted || segmentsEnded) {
          this.errors[index] = 'Команда вне сегмента!';
          continue;
        }
        if (!instructionPointerInstalled) {
          instructionPointer = nextAddress;
          instructionPointerInstalled = true;
        }
        if (!startAddressInstalled) {
          startAddress = nextAddress;
          startAddressInstalled = true;
        }

        const operands = this.getOperandsByString(line.substring(nextIndex, line.length));
        let {op1} = operands;
        const {op2} = operands;

        if (command.startsWith("J") && op1.operand === Operand.Address && op2 === null) {
          op1 = new CollectedOperand(Operand.Displacement, op1.id, null, null);
        }

        let commandLength = 1;
        if (op1 && op2) {
          commandLength++;
          if (op2.operand === Operand.Immediate) {
            if (op2.value === null) {
              this.errors[index] = `Неверное число ${op2.id}`;
            }
            if (op1.operand === Operand.Register) {
              commandLength += 2;
            }
          }
          if (op1.operand === Operand.Address || op2.operand === Operand.Address) {
            commandLength += 2;
          }
        } else if (op1) {
          commandLength += op1.operand === Operand.Address ? 3 : 1;
        }

        const key = new CommandKey(command, op1 ? op1.operand : null, op2 ? op2.operand : null);

        const c: Command = this.commands.get(JSON.stringify(key));

        if (c) {
          commandsToTranslate[index] = new CollectedCommand(c, op1, op2, nextAddress, commandLength);
          listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: null};
          nextAddress += commandLength;
        } else {
          this.errors[index] = 'Неверные операнды команды!';
        }
      } else {
        const label = command.endsWith(':');
        if (label) {
          command = command.substring(0, command.length - 1);
        }
        if (!this.idIsValid(command)) {
          this.errors[index] = `Идентификатор метки может начинаться только с _, - или буквы: ${command}`;
          continue;
        } else if (!this.idIsUnique(command)) {
          this.errors[index] = `Идентификатор уже определен:  ${command}`;
          continue;
        }

        if (label) {
          this.namesTable.set(command, {type: Type.Label, address: nextAddress});
          listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: null};
        } else {
          if (!startAddressInstalled) {
            startAddress = nextAddress;
            startAddressInstalled = true;
          }

          const declaration = line.substring(nextIndex, line.length).trim().split(/[\s,]+/, 2)
          const direction = declaration[0];

          switch (direction) {
            case 'DW': {
              nextAddress += this.define(this.directions.get(direction), nextAddress, command, declaration, index, definitions, listingHex);
              break;
            }
            case 'ENDS': {
              segmentsEnded = true;
              if (declaration.length > 1) {
                this.errors[index] = `Неожиданное слово ${declaration[1]}`;
              }
              listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: null};
              break;
            }
            default: {
              this.errors[index] = 'Недопустимая инструкция';
              break
            }
          }
        }
      }
    }

    this.translateCommands(segmentName, startAddress, nextAddress - startAddress, commandsToTranslate, codeLines, listingHex, definitions);

    let objectCode;
    if (!Object.keys(this.errors).length) {
      objectCode = this.getObjectCode(instructionPointer);
    }

    return [this.generateListing(codeLines, listingHex, endIndex, segmentName), objectCode];
  }

  getObjectCode(instructionPointer: number) {
    let objectCode = '';
    this.program.add(0x45);
    this.program.add((instructionPointer & 0xFF));
    this.program.add((instructionPointer & 0xFF00) >> 8);
    for (let i = 0; i < this.program.size(); i++) {
      objectCode += this.program.get(i).toString(2);
    }
    return objectCode;
  }

  generateListing(codeLines: Map<number, string>, listingHex: ListingHexItem[], endIndex: number, segmentName: string) {
    let outputString = '';
    let first = true;
    for (const [key, value] of codeLines.entries()) {
      const index = key;
      const pair = listingHex[index - 1] || null;
      let address = pair ? pair.address : null;
      let hexedData = pair ? pair.value : null;
      hexedData = hexedData || '';
      let splitData: Array<string> | null = null;
      if (hexedData) {
        splitData = hexedData.split(/\n/);
        hexedData = splitData[0];
      }

      const hexedAddress = address ? (address + 0x10000).toString(16).substring(1).toUpperCase() : '';

      outputString += `${first ? "" : "\n"}${stringToLength(index.toString(), 3)} | ${stringToLength(hexedAddress, 5)} | ${stringToLength(hexedData, 12)}| ${value}`;

      if (splitData && splitData.length) {
        const w = hexedData.split(" ")[0].length === 4;
        for (let i = 1; i < splitData.length; i++) {
          if (address) {
            address += (w ? 8 : 7) * i;
          }
          outputString += `\n \t${address ? (address + 0x10000).toString(16).substring(1).toUpperCase() : ''}      ${splitData[i]}`;
        }
      }
      if (first) {
        first = false;
      }
      if (index === endIndex) {
        break;
      }
    }

    if (this.namesTable.size > 0) {
      outputString += '\n\n\nТаблица имён:\n';
      outputString += stringToLength('Имя', 16) + stringToLength('Тип', 16) + stringToLength('Значение', 16);
      for (const [key, value] of this.namesTable.entries()) {
        outputString += `\n${stringToLength(key, 16)}${stringToLength(Type[value.type], 16)}${segmentName}:${(value.address + 0x10000).toString(16).substring(1)}`
      }
    }

    if (Object.keys(this.errors).length) {
      outputString += '\n\n';
      for (const [key] of Object.entries(this.errors)) {
        const errors = this.errors[key].split(/\n/);
        for (const error of errors) {
          outputString += `\n| ОШИБКА Строка ${key}: ${error}`;
        }
      }
    }

    return outputString;
  }

  toHex(number: number) {
    if (!number) return number;
    return parseInt(number.toString(16), 16)
  }

  translateCommands(
    segmentName: string,
    startAddress: number,
    segmentLength: number,
    commandsToTranslate: Record<number, CollectedCommand>,
    codeLines: Map<number, string>,
    listingHex: ListingHexItem[],
    definitions: Record<number, Definition>
  ) {
    //    H                         T                            E
    //    48 SEG_NAME 00 SEG_LEN(2) 54 START_ADDRESS(2) COMMANDS 45 POINT(2)
    this.program.add(0x48);
    const encoder = new TextEncoder();
    const seg = encoder.encode(segmentName);

    for (const byte of seg) {
      this.program.add(byte);
    }

    this.program.add(0);

    const reversedSegmentLength = getReversedWord(segmentLength);
    this.program.add(reversedSegmentLength[0]);
    this.program.add(reversedSegmentLength[1]);

    this.program.add(0x54);

    const reversedStartAddress = getReversedWord(startAddress);
    this.program.add(reversedStartAddress[0]);
    this.program.add(reversedStartAddress[1]);

    for (let i = 0; i < codeLines.size; i++) {
      const c: CollectedCommand = commandsToTranslate[i];
      if (c) {
        const binaryCommand = new Array<number>(c.length);
        binaryCommand[0] = (this.toHex(c.command.code) & 0xFF);

        if (c.command.d || c.command.d === 0) {
          binaryCommand[0] <<= 1;
          binaryCommand[0] |= c.command.d;
        }

        console.log(c);

        if (c.length > 1) {
          switch (c.op1.operand) {
            case Operand.Register: {
              binaryCommand[1] = c.command.mod << 6;
              if (c.command.d || c.command.d === 0) {
                binaryCommand[1] |= (c.command.d === 1 ? this.toHex(c.op1.register) << 3 : this.toHex(c.op2.register));
              } else {
                binaryCommand[1] |= (c.command.reg << 3) | this.toHex(c.op1.register);
              }
              break;
            }
            case Operand.Address: {
              const name = this.namesTable.get(c.op1.id.toUpperCase()) || null;
              if (name) {
                binaryCommand[1] = ((c.command.mod << 6) | c.command.rm);
                const address = getReversedWord(name.address);
                binaryCommand[2] = address[0];
                binaryCommand[3] = address[1];
              } else {
                this.errors[i] = `Необъявленный идентификатор: ${c.op1.id}`;
                continue;
              }
              break;
            }
            case Operand.Displacement: {
              const name = this.namesTable.get(c.op1.id.toUpperCase()) || null;
              if (name === null) {
                this.errors[i] = `Идентификатор не объявлен: ${c.op1.id}`;
              }
              const type: Type = name.type;
              if (type !== Type.Label) {
                this.errors[i] = 'Аргумент команды должен быть меткой!';
                continue;
              }
              const displacement = name.address - c.address;
              if (!this.isValidType(displacement, Type.Byte)) {
                this.errors[i] = `Смещение ${displacement} превышает диапазон ${Type[Type.Byte]}`;
                continue;
              }
              binaryCommand[1] = displacement;
              break;
            }
            case Operand.Immediate: {
              if (c.op2 === null) {
                binaryCommand[1] = c.op1.value;
              } else {
                this.errors[i] = 'Недопустимые операнды!';
              }
              break;
            }
            default: {
              this.errors[i] = 'Такие операнды не допустимы!';
              continue;
            }
          }

          if (c.op2) {
            switch (c.op2.operand) {
              case Operand.Register: {
                if (c.command.d || c.command.d === 0) {
                  binaryCommand[1] |= c.command.d === 1 ? this.toHex(c.op2.register) : this.toHex(c.op2.register) << 3;
                }
                break;
              }
              case Operand.Address: {
                const name = this.namesTable.get(c.op2.id.toUpperCase()) || null;
                if (name) {
                  binaryCommand[1] |= c.command.rm;
                  const address = getReversedWord(name.address);
                  binaryCommand[2] = address[0];
                  binaryCommand[3] = address[1];
                } else {
                  this.errors[i] = `Необъявленный идентификатор: ${c.op2.id}`;
                  continue;
                }
                break;
              }
              case Operand.Immediate: {
                if (this.isValidType(c.op2.value, Type.Word)) {
                  binaryCommand[2] = c.op2.value & 0xFF;
                  binaryCommand[3] = (c.op2.value >> 8) & 0xFF;
                } else {
                  this.errors[i] = `Значение ${c.op2.value} превышает диапазон ${Type[Type.Word]}`;
                }
                break;
              }
              default: {
                this.errors[i] = "Операнды недопустимы";
                continue;
              }
            }
          } else {
            if (c.command.reg) {
              binaryCommand[1] |= c.command.reg << 3;
            }
          }

          if (c.command.w) {
            binaryCommand[0] <<= 1;
            binaryCommand[0] |= 1;

            if (!c.command.w) {
              this.errors[i] = "Недопустимые типы операндов";
            }
          }
        } else {
          binaryCommand[0] = this.toHex(c.command.code);
        }

        for (const b of binaryCommand) {
          this.program.add(b);
        }

        let hexCommand = '';
        hexCommand += (binaryCommand[0] & 0xFF).toString(16) + ' ';

        if (binaryCommand.length > 1) {
          hexCommand += ((binaryCommand[1] & 0xFF) + 0x100).toString(16).substring(1) + ' ';
          if (binaryCommand.length === 3) {
            hexCommand += ((binaryCommand[2] & 0xFF) + 0x100).toString(16).substring(1) + ' ';
          } else if (binaryCommand.length > 3) {
            hexCommand += ((((binaryCommand[3] & 0xFF) << 8) | (binaryCommand[2] & 0xFF)) + 0x10000).toString(16).substring(1);
          }
        }

        listingHex[i - 1] = <ListingHexItem>{address: listingHex[i - 1].address, value: hexCommand.toString().toUpperCase()};
        continue;
      }

      const d = definitions[i];

      if (d) {
        const nameInfo = this.namesTable.get(d.id);
        const type = nameInfo.type;
        const w = type === Type.Word;
        const values = d.value;
        let hexDefinition = '';
        let count = 1;
        for (const v of values) {
          if (v === null) {
            this.program.add(0);
            if (w) {
              this.program.add(0);
              hexDefinition += '????';
              hexDefinition += count % 4 !== 0 || count === values.length ? " " : " +\n";
            } else {
              hexDefinition += '??';
              hexDefinition += count % 7 !== 0 || count === values.length ? " " : "+\n";
            }
          } else {
            this.program.add(v & 0xFF);
            if (w) {
              this.program.add((v & 0xFF00) >> 8);
              hexDefinition += ((v & 0xFFFF) + 0x10000).toString(16).substring(1);
              hexDefinition += count % 4 !== 0 || count === values.length ? " " : " +\n";
            } else {
              hexDefinition += ((v & 0xFF) + 0x100).toString(16).substring(1);
              hexDefinition += count % 7 !== 0 || count === values.length ? " " : "+\n";
            }
          }

          count++;
        }

       listingHex[i - 1] =  <ListingHexItem>{address: listingHex[i - 1].address, value: hexDefinition.toString().toUpperCase()};
      }
    }
  }

  define(
    type: Type,
    nextAddress: number,
    id: string,
    declaration: string[],
    index: number,
    definitions: Record<string, Definition>,
    listingHex: ListingHexItem[]
  ) {
    if (declaration.length < 2) {
      this.warnings[index] = 'Пропущен операнд - возможно 0';
      this.namesTable.set(id, {type, address: nextAddress});
      listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: type === Type.Byte ? '00' : '0000'};
      return type === Type.Byte ? 1 : 2;
    }
    const stringValues = declaration[1].split(/[\s,]+/);
    const valueErrors = '';
    const intValues = [stringValues.length];
    for (let i = 0; i < stringValues.length; i++) {
      try {
        intValues[i] = this.checkOperandType(stringValues[i], type);
      } catch (e) {
        if (e instanceof ValueOutOfRange) {
          this.errors[index] = e.message;
        }
      }
    }
    if (valueErrors.length) {
      this.errors[index] = valueErrors;
    }

    this.namesTable.set(id, {type, address: nextAddress});
    listingHex[index - 1] = <ListingHexItem>{address: nextAddress, value: null};
    definitions[index] = {id, value: intValues};
    return type === Type.Byte ? intValues.length : intValues.length * 2;
  }

  idIsValid(id: string) {
    return new RegExp('[\\w_][\\w\\d_-]*', 'giu').test(id);
  }

  idIsUnique(id: string) {
    return !this.namesTable.has(id);
  }

  isValidType(number: number, type: Type) {
    return (type === Type.Byte && number >= -256 && number <= 255) || (type == Type.Word && number >= -65536 && number <= 65535);
  }

  checkOperandType(operand: string, type: Type) {
    if (type != Type.Byte && type != Type.Word) {
      return 0;
    }
    const number = this.operandToInt(operand);
    if (this.isValidType(number, type)) {
      return number;
    } else {
      throw new ValueOutOfRange(`Значение ${number} превышает диапазон ${Type[type]}`);
    }
  }

  operandToInt(operand: string) {
    let operandCopy = operand.toUpperCase();
    const operandLength = operandCopy.length;
    let hexed = false;
    if (operandLength === 1 && this.isDigit(operand)) {
      return parseInt(operand);
    } else {
      const lastChar = operandCopy.slice(-1);
      if (lastChar === 'H') {
        operandCopy = operandCopy.substring(0, operandLength - 1);
        hexed = true;
      }
    }

    return hexed ? parseInt(operandCopy, 16) : parseInt(operandCopy);
  }

  isDigit(string: string) {
    return /^\d+$/.test(string);
  }

  getOperandsByString(operands: string) {
    const ops = operands.trim().split(/[\s,]+/, 2);
    if (ops.length === 1) {
      return {op1: this.getOperandByString(ops[0]), op2: null};
    } else if (ops.length > 1) {
      return {op1: this.getOperandByString(ops[0]), op2: this.getOperandByString(ops[1])};
    }
  }

  getOperandByString(operand: string) {
    let register = null;
    for (const reg in Register) {
      if (!isNaN(parseInt(reg))) continue;
      if (operand === reg) {
        register = reg;
        break;
      }
    }

    if (isNaN(parseInt(register))) {
      register = Register[register]?.toString();
    }

    if (register) {
      return new CollectedOperand(Operand.Register, null, register, null);
    }

    const operandLength = operand.length;
    if (operandLength === 1) {
      return this.isDigit(operand) ?
        new CollectedOperand(Operand.Immediate, null, null, parseInt(operand)) :
        new CollectedOperand(Operand.Address, operand, null, null);
    }

    if (this.isDigit(operand[0]) || (operand[0] === '-' && this.isDigit(operand[1]))) {
      try {
        return new CollectedOperand(Operand.Immediate, null, null, this.operandToInt(operand));
      } catch {
        return new CollectedOperand(Operand.Immediate, operand, null, null);
      }
    }

    return new CollectedOperand(Operand.Address, operand, null, null);
  }
}

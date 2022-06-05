import {Command} from './Command';
import {CollectedOperand} from './CollectedOperand';

export class CollectedCommand {
  readonly command: Command;
  readonly address: number;
  readonly length: number;
  readonly op1: CollectedOperand;
  readonly op2: CollectedOperand;

  constructor(command: Command, op1: CollectedOperand, op2: CollectedOperand, address: number, length: number) {
    this.command = command;
    this.op1 = op1;
    this.op2 = op2;
    this.address = address;
    this.length = length;
  }
}
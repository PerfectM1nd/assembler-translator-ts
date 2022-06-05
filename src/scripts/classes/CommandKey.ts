import { Operand } from "../../enums";

export class CommandKey {
  readonly name: string;
  readonly op1: Operand;
  readonly op2: Operand;

  constructor(name: string, op1: Operand, op2: Operand) {
    this.name = name;
    this.op1 = op1;
    this.op2 = op2;
  }
}
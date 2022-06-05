import { Operand, Register } from "../../enums";

export class CollectedOperand {
  readonly operand: Operand;
  readonly id: string;
  readonly register: Register;
  readonly value: number;

  constructor(operand: Operand, id: string, register: Register, value: number) {
    this.operand = operand;
    this.id = id;
    this.register = register;
    this.value = value;
  }
}
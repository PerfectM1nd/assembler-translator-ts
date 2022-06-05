export enum Operand {
  Register,
  Address,
  Immediate,
  Displacement
}

export enum Register {
  AX,
  CX,
  DX,
  BX,
  SP,
  BP,
  SI,
  DI
}

export enum Type {
  String,
  Byte,
  Word,
  Label
}
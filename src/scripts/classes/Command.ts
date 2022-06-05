export class Command {
  readonly code: number;
  readonly d: number;
  readonly mod: number;
  readonly reg: number;
  readonly rm: number;
  readonly w: boolean;

  constructor(code: number, d: number, w: boolean, mod: number, reg: number, rm: number) {
    this.code = code;
    this.d = d;
    this.w = w;
    this.mod = mod;
    this.reg = reg;
    this.rm = rm;
  }
}
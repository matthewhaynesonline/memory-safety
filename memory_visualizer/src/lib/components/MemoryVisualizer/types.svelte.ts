import { Byte } from "../../memory.svelte";

export interface RowByte {
  address: number;
  byte: Byte;
}

export interface Row {
  startAddress: number;
  bytes: Array<RowByte>;
}

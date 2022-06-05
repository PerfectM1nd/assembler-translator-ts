import { Type } from "../enums";

export interface NamesTableItem {
  type: Type,
  address: number
}

export interface ListingHexItem {
  address: number,
  value: string | null
}

export interface Definition {
  id: string,
  value: number[]
}
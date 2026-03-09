import { NextResponse } from "next/server";

export const bigintJsonReplacer = (_key: string, value: unknown): unknown => {
  return typeof value === "bigint" ? value.toString() : value;
};

export function jsonWithBigInt(data: unknown, init?: ResponseInit): NextResponse {
  return new NextResponse(JSON.stringify(data, bigintJsonReplacer), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

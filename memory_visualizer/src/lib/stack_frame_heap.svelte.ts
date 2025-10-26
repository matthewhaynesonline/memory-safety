import { type BundledLanguage } from "shiki";

import { Memory } from "./memory.svelte";

export interface FrameVariable {
  name: string;
  address: number;
  size: number;
  value: number | string;
}

export class StackFrame {
  memory: Memory | null = $state(null);
  name: string = $state("");
  codeSnippet: string = $state("");
  codeSnippetLanguage: BundledLanguage = $state("c");
  baseAddress: number = $state(0);
  variables: Array<FrameVariable> | null = $state(null);

  size: number = $derived.by(() => {
    let size = 0;

    this.variables?.forEach((variable: FrameVariable) => {
      size += variable.size;
    });

    return size;
  });

  constructor(
    memory: Memory,
    name: string,
    codeSnippet: string,
    codeSnippetLanguage: BundledLanguage,
    baseAddress: number = 0,
    variables: Array<FrameVariable> | null = null
  ) {
    this.memory = memory;
    this.name = name;
    this.codeSnippet = codeSnippet;
    this.codeSnippetLanguage = codeSnippetLanguage;
    this.baseAddress = baseAddress;
    this.variables = variables;
  }
}

export class Heap {
  memory: Memory | null = $state(null);
  variables: Array<FrameVariable> | null = $state(null);

  size: number = $derived.by(() => {
    let size = 0;

    this.variables?.forEach((variable: FrameVariable) => {
      size += variable.size;
    });

    return size;
  });

  hasAllocations = $derived(this.variables && this.variables.length);

  constructor(memory: Memory, variables: Array<FrameVariable> | null = null) {
    this.memory = memory;
    this.variables = variables;
  }
}

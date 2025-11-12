<script lang="ts">
  import {
    Memory,
    Int32,
    FixedString,
    Byte,
    STACK_STARTING_ADDRESS,
    MEMORY_SIZE,
  } from "./lib/memory.svelte";

  import { UserStruct, SessionStruct } from "./lib/user.svelte";

  import {
    StackFrame,
    Heap,
    type FrameVariable,
  } from "./lib/stack_frame_heap.svelte";

  import Gc from "./lib/components/Gc.svelte";
  import HeapComponent from "./lib/components/Heap.svelte";
  import MemoryVisualizer from "./lib/components/MemoryVisualizer/MemoryVisualizer.svelte";
  import MemoryInput from "./lib/components/MemoryVisualizer/Input.svelte";
  import Session from "./lib/components/Session.svelte";
  import StackFrameComponent from "./lib/components/StackFrame.svelte";
  import User from "./lib/components/User.svelte";
  import { onMount } from "svelte";

  const autoCollapseNavKey = "memVisualizer__autoCollapseNav";
  let autoCollapseNav = $state(true);

  const showCodeByDefaultKey = "memVisualizer__showCodeByDefault";
  let showCodeByDefault = $state(true);

  let title = $state("");
  let navExpanded = $state(true);
  let showMemoryInput = $state(false);

  let memory = $state(new Memory(MEMORY_SIZE, STACK_STARTING_ADDRESS, false));
  let memoryVisualizerRef;

  let stackOneAddress = $state<number>(-1);
  let stackOne = $state<StackFrame | null>(null);

  let stackTwoAddress = $state<number>(-1);
  let stackTwo = $state<StackFrame | null>(null);

  let stackThreeAddress = $state<number>(-1);
  let stackThree = $state<StackFrame | null>(null);

  let heap: Heap | null = $state(null);

  let userAddress = $state<number>(-1);
  let user = $state<UserStruct | null>(null);

  let sessionAddress = $state<number>(-1);
  let session = $state<SessionStruct | null>(null);

  let sidePanelActive = $derived(
    !!stackOne || !!user || !!session || memory.isGcEnabled
  );

  onMount(() => {
    autoCollapseNav = loadSettings(autoCollapseNavKey);
    showCodeByDefault = loadSettings(showCodeByDefaultKey);
  });

  function loadSettings(settingKey: string) {
    const settingValue = window.localStorage.getItem(settingKey) || "true";
    return JSON.parse(settingValue);
  }

  function saveSetting(settingKey: string, newValue) {
    const settingValue = JSON.stringify(newValue);
    window.localStorage.setItem(settingKey, settingValue);
  }

  // =========================================
  // Memory Demos
  // =========================================
  function bitsDemo(): void {
    console.log("bitsDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Bits Demo";

    const address = memory.allocateStack(1);
    memory.writeByte(address, 65);
    memory.writeByte(address, 97);

    stackOne = new StackFrame(
      memory,
      "bits",
      "char foo = 'A';\nfoo = 'a';",
      "c",
      address,
      [
        {
          name: "foo",
          address: address,
          size: 1,
          value: 97,
        },
      ]
    );
  }

  function pointersDemo(): void {
    console.log("pointersDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Pointers Demo";

    const valueAddress = memory.allocateStack(1);
    const nonPointerAddress = memory.allocateStack(1);
    const pointerAddress = memory.allocateStack(1);

    memory.writeByte(valueAddress, 97);
    memory.writeByte(nonPointerAddress, valueAddress);
    memory.writePointer(pointerAddress, valueAddress);

    stackOne = new StackFrame(
      memory,
      "pointers",
      "char foo = 'a';\nuint8_t bar = 95;\nchar *baz = &foo",
      "c",
      valueAddress,
      [
        {
          name: "foo",
          address: valueAddress,
          size: 1,
          value: 97,
        },
        {
          name: "bar",
          address: nonPointerAddress,
          size: 1,
          value: valueAddress,
        },
        {
          name: "*baz",
          address: pointerAddress,
          size: 1,
          value: valueAddress,
        },
      ]
    );
  }

  function stackFrameDemo(): void {
    console.log("stackFrameDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Stack Frames Demo";

    doStackOne();
    doStackTwo();
  }

  function doStackOne(): void {
    const variableSize = 1;

    const stackOneSnippet = `void foo_fn() {
    char foo = 'A'; 
    char bar = 'B'; 
    baz_fn();
}`;

    stackOneAddress = memory.allocateStack(variableSize);

    if (stackOneAddress === -1) {
      console.error("Failed to allocate Stack One");
      return;
    }

    const stackVariables: Array<FrameVariable> = [
      {
        name: "foo",
        address: stackOneAddress,
        size: variableSize,
        value: 65,
      },
      {
        name: "bar",
        address: memory.allocateStack(variableSize),
        size: variableSize,
        value: 66,
      },
    ];

    stackVariables.forEach((variable: FrameVariable) => {
      memory.writeByte(variable.address, variable.value as number);
    });

    stackOne = new StackFrame(
      memory,
      "foo_fn()",
      stackOneSnippet,
      "c",
      stackOneAddress,
      stackVariables
    );
  }

  function doStackTwo(): void {
    const variableSize = 1;

    const stackTwoSnippet = `void baz_fn() {
    char baz = 'a'; 
    char bad = 'b'; 
}`;

    stackTwoAddress = memory.allocateStack(variableSize);

    if (stackTwoAddress === -1) {
      console.error("Failed to allocate Stack Two");
      return;
    }

    const stackVariables: Array<FrameVariable> = [
      {
        name: "baz",
        address: stackTwoAddress,
        size: variableSize,
        value: 97,
      },
      {
        name: "bad",
        address: memory.allocateStack(variableSize),
        size: variableSize,
        value: 98,
      },
    ];

    stackVariables.forEach((variable: FrameVariable) => {
      memory.writeByte(variable.address, variable.value as number);
    });

    stackTwo = new StackFrame(
      memory,
      "baz_fn()",
      stackTwoSnippet,
      "c",
      stackTwoAddress,
      stackVariables
    );
  }

  function heapDemo(): void {
    console.log("heapDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Heap Demo";

    const variableSize = 1;

    const fooAddress = memory.allocateStack(variableSize);
    memory.writePointer(fooAddress, 0);
    const barAddress = memory.allocateStack(variableSize);
    memory.writePointer(barAddress, 0);

    const heapVariableSize = 1 * 4;

    const heapVariables: Array<FrameVariable> = [
      {
        name: "dog",
        address: memory.allocate(heapVariableSize),
        size: heapVariableSize,
        value: "dog",
      },
      {
        name: "cat",
        address: memory.allocate(heapVariableSize),
        size: heapVariableSize,
        value: "cat",
      },
    ];

    heap = new Heap(memory, heapVariables);

    memory.writeString(
      heapVariables[0].address,
      new FixedString(heapVariables[0].value as string, heapVariables[0].size)
    );
    memory.writePointer(fooAddress, heapVariables[0].address);

    memory.writeString(
      heapVariables[1].address,
      new FixedString(heapVariables[1].value as string, heapVariables[1].size)
    );
    memory.writePointer(barAddress, heapVariables[1].address);

    stackOne = new StackFrame(
      memory,
      "foo_fn()",
      `void foo_fn() {
    char *foo = "dog"; 
    char *bar = "cat"; 
    baz_fn();
}`,
      "c",
      fooAddress,
      [
        {
          name: "*foo",
          address: fooAddress,
          size: variableSize,
          value: heap?.variables[0].address,
        },
        {
          name: "*bar",
          address: barAddress,
          size: variableSize,
          value: heap?.variables[1].address,
        },
      ]
    );

    doStackTwo();
  }

  function fatPointerDemo(): void {
    console.log("fatPointerDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Fat Pointer Demo";

    const variableSize = 1;

    const fooAddress = memory.allocateStack(variableSize);
    memory.writePointer(fooAddress, 0);
    const fooLen = memory.allocateStack(variableSize);
    memory.writeByte(fooLen, 0);
    const fooCapacity = memory.allocateStack(variableSize);
    memory.writeByte(fooCapacity, 0);

    const barAddress = memory.allocateStack(variableSize);
    memory.writePointer(barAddress, 0);
    const barLen = memory.allocateStack(variableSize);
    memory.writeByte(barLen, 0);
    const barCapacity = memory.allocateStack(variableSize);
    memory.writeByte(barCapacity, 0);

    const variableSizeRust = 3;

    const heapVariables: Array<FrameVariable> = [
      {
        name: "dog",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "dog",
      },
      {
        name: "cat",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "cat",
      },
    ];

    heap = new Heap(memory, heapVariables);

    memory.writeString(
      heapVariables[0].address,
      new FixedString(heapVariables[0].value as string, heapVariables[0].size)
    );
    memory.writePointer(fooAddress, heapVariables[0].address);
    memory.writeByte(fooLen, variableSizeRust);
    memory.writeByte(fooCapacity, variableSizeRust);

    memory.writeString(
      heapVariables[1].address,
      new FixedString(heapVariables[1].value as string, heapVariables[1].size)
    );
    memory.writePointer(barAddress, heapVariables[1].address);
    memory.writeByte(barLen, variableSizeRust);
    memory.writeByte(barCapacity, variableSizeRust);

    stackOne = new StackFrame(
      memory,
      "foo_fn()",
      `fn foo_fn() {
    let foo = String::from("dog");
    let bar = String::from("cat");
}`,
      "rust",
      fooAddress,
      [
        {
          name: "foo:ptr",
          address: fooAddress,
          size: variableSize,
          value: heap?.variables[0].address,
        },
        {
          name: "foo:len",
          address: fooLen,
          size: variableSize,
          value: variableSizeRust,
        },
        {
          name: "foo:capacity",
          address: fooCapacity,
          size: variableSize,
          value: variableSizeRust,
        },
        {
          name: "bar:ptr",
          address: barAddress,
          size: variableSize,
          value: heap?.variables[0].address,
        },
        {
          name: "bar:len",
          address: barLen,
          size: variableSize,
          value: variableSizeRust,
        },
        {
          name: "bar:capacity",
          address: barCapacity,
          size: variableSize,
          value: variableSizeRust,
        },
      ]
    );
  }

  // ==========
  // Passing
  // ==========
  function passByValueDemo(): void {
    console.log("passByValueDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Pass By Value Demo";

    const variableSize = 1;

    const stackOneSnippet = `int main() {
    char foo = 'A';
    char bar = 'B';
    
    by_value(foo, bar);
    
    return 0;
}`;

    stackOneAddress = memory.allocateStack(variableSize);
    const barAddress = memory.allocateStack(variableSize);

    const passFunctionAddress = memory.allocateStack(variableSize);

    if (stackOneAddress === -1) {
      console.error("Failed to allocate Stack One");
      return;
    }

    const stackOneVariables: Array<FrameVariable> = [
      {
        name: "foo",
        address: stackOneAddress,
        size: variableSize,
        value: 65,
      },
      {
        name: "bar",
        address: barAddress,
        size: variableSize,
        value: 66,
      },
    ];

    stackOneVariables.forEach((variable: FrameVariable, index: number) => {
      memory.writeByte(variable.address, variable.value as number);
    });

    stackOne = new StackFrame(
      memory,
      "main()",
      stackOneSnippet,
      "c",
      stackOneAddress,
      stackOneVariables
    );

    const stackTwoSnippet = `void by_value(char foo, char bar) {
    foo = 'X';
    bar = 'Y';
}`;

    stackTwoAddress = passFunctionAddress;

    const stackTwoVariables: Array<FrameVariable> = [
      {
        name: "foo",
        address: stackTwoAddress,
        size: variableSize,
        value: stackOneVariables[0].value,
      },
      {
        name: "bar",
        address: memory.allocateStack(variableSize),
        size: variableSize,
        value: stackOneVariables[1].value,
      },
    ];

    stackTwoVariables.forEach((variable: FrameVariable) => {
      memory.writeByte(variable.address, variable.value as number);
    });

    stackTwoVariables[0].value = 88;
    stackTwoVariables[1].value = 89;

    stackTwoVariables.forEach((variable: FrameVariable) => {
      memory.writeByte(variable.address, variable.value as number);
    });

    stackTwo = new StackFrame(
      memory,
      "by_value()",
      stackTwoSnippet,
      "c",
      stackTwoAddress,
      stackTwoVariables
    );
  }

  function passByReferenceDemo(): void {
    console.log("passByReferenceDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Pass By Reference Demo";

    const variableSize = 1;

    const stackOneSnippet = `int main() {
    char foo = 'A';
    char bar = 'B';
    
    by_reference(&foo, &bar);
    
    return 0;
}`;

    stackOneAddress = memory.allocateStack(variableSize);
    const barAddress = memory.allocateStack(variableSize);
    const passFunctionAddress = memory.allocateStack(variableSize);

    if (stackOneAddress === -1) {
      console.error("Failed to allocate Stack One");
      return;
    }

    const stackOneVariables: Array<FrameVariable> = [
      {
        name: "foo",
        address: stackOneAddress,
        size: variableSize,
        value: 65,
      },
      {
        name: "bar",
        address: barAddress,
        size: variableSize,
        value: 66,
      },
    ];

    stackOneVariables.forEach((variable: FrameVariable, index: number) => {
      memory.writeByte(variable.address, variable.value as number);
    });

    stackOne = new StackFrame(
      memory,
      "main()",
      stackOneSnippet,
      "c",
      stackOneAddress,
      stackOneVariables
    );

    const stackTwoSnippet = `void by_reference(char *foo, char *bar) {
    *foo = 'X';
    *bar = 'Y';
}`;

    stackTwoAddress = passFunctionAddress;

    const stackTwoVariables: Array<FrameVariable> = [
      {
        name: "*foo",
        address: stackTwoAddress,
        size: variableSize,
        value: stackOneVariables[0].address,
      },
      {
        name: "*bar",
        address: memory.allocateStack(variableSize),
        size: variableSize,
        value: stackOneVariables[1].address,
      },
    ];

    stackTwoVariables.forEach((variable: FrameVariable) => {
      memory.writePointer(variable.address, variable.value as number);
    });

    stackOneVariables[0].value = 88;
    stackOneVariables[1].value = 89;

    stackOneVariables.forEach((variable: FrameVariable, index: number) => {
      if (index < 2) {
        memory.writeByte(variable.address, variable.value as number);
      }
    });

    stackTwo = new StackFrame(
      memory,
      "by_reference()",
      stackTwoSnippet,
      "c",
      stackTwoAddress,
      stackTwoVariables
    );
  }

  // =========================================
  // Buffer overflow - bounds checking issue
  // =========================================
  function simpleOverflowDemo(): void {
    console.log("simpleOverflowDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Simple Overflow Demo";

    allocateUserAndSession();

    user = new UserStruct(memory, userAddress);

    memory.writeString(
      user.usernameAddress,
      new FixedString("alice", UserStruct.USERNAME_SIZE)
    );

    // Vulnerability / corruption: Password is 25 chars, buffer is only 16
    // This will overflow into is_admin field
    const longPass = "secret0123456789876543210";

    memory.writeString(
      user.passwordAddress,
      new FixedString(longPass, longPass.length)
    );

    createSession(userAddress);
  }

  function preciseOverflowDemo(): void {
    console.log("preciseOverflowDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Precise Overflow Demo";

    userAddress = memory.allocate(UserStruct.USER_STRUCT_SIZE);

    if (userAddress === -1) {
      console.error("Failed to allocate User");
      return;
    }

    sessionAddress = memory.allocate(SessionStruct.SESSION_STRUCT_SIZE);

    if (sessionAddress === -1) {
      console.error("Failed to allocate Session");
      return;
    }

    user = new UserStruct(memory, userAddress);

    memory.writeString(
      user.usernameAddress,
      new FixedString("alice", UserStruct.USERNAME_SIZE)
    );

    // EXPLOIT: Exactly 16 chars password + 4 bytes to overflow into is_admin
    // The 4 bytes after "secret0123456789" will be written to is_admin field
    // \u0001\u0000\u0000\u0000 = 1 in little-endian 32-bit int
    const overflowPass = "secret0123456789\u0001\u0000\u0000\u0000";

    memory.writeString(
      user.passwordAddress,
      new FixedString(overflowPass, overflowPass.length)
    );

    createSession(userAddress);
  }

  // ===============================
  // Bounds Checking
  // ===============================
  function simpleOverflowBoundsCheckDemo(): void {
    console.log("simpleOverflowBoundsCheckDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    memory.enableBoundsChecking(true);
    // title = "Bounds Checking Demo";

    try {
      userAddress = memory.allocate(UserStruct.USER_STRUCT_SIZE);

      if (userAddress === -1) {
        console.error("Failed to allocate User");
        return;
      }

      user = new UserStruct(memory, userAddress);

      memory.writeString(
        user.usernameAddress,
        new FixedString("alice", UserStruct.USERNAME_SIZE)
      );

      // Vulnerability / corruption: Password is 25 chars, buffer is only 16
      // This will overflow into is_admin field
      const longPass = "secret0123456789876543210";

      memory.writeString(
        user.passwordAddress,
        new FixedString(longPass, longPass.length)
      );

      createSession(userAddress);
    } catch (error) {
      window.alert(error);
      clearMemory();
    }

    title = "Bounds Checking Demo";

    memory.enableBoundsChecking(false);
  }

  // ===============================
  // Use-After-Free (Lifetimes)
  // ===============================
  function uafDemo(): void {
    console.log("uafDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Dangling Pointer Demo";

    login();
    logout();
    uafCorrupt();
  }

  function uafCorrupt(): void {
    console.log("uafCorrupt");

    if (userAddress === -1) {
      console.warn("No freed user to corrupt");
      return;
    }

    // Allocate new memory - may reuse the freed User's address
    // This simulates the allocator reusing freed memory
    const corruptAddr = memory.allocate(UserStruct.USER_STRUCT_SIZE);

    if (corruptAddr === -1) {
      console.error("Failed to allocate corruption data");
      return;
    }

    // Fill with recognizable garbage (0x42 = 'B')
    const corruptBytes = Array.from(
      { length: UserStruct.USER_STRUCT_SIZE },
      () => new Byte(0x42)
    );

    let corruptMessage = "Memory corrupted: allocator reused freed User memory";

    if (memory.isGcEnabled) {
      corruptMessage =
        "Memory NOT corrupted: allocator did not reuse User memory";
    }

    memory.writeBytes(corruptAddr, corruptBytes, corruptMessage);

    // Overwrite start with "CORRUPTED!!!" for visibility
    memory.writeString(
      corruptAddr,
      new FixedString("CORRUPTED!!!", UserStruct.USERNAME_SIZE)
    );
  }

  // ==============
  // GC
  // ==============
  function gcDemo() {
    console.log("gcDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    memory.enableGc(true);
    memoryVisualizerRef.collapseBytes();
    title = "GC Demo";

    login();
    logout();
    uafCorrupt();
    closeSession();
  }

  // ===============
  // Borrow Checker
  // ===============
  function manyImmutDemo(): void {
    console.log("manyImmutDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Many Immutable Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);

    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    heapVariables.forEach((variable: FrameVariable) => {
      memory.writeString(
        variable.address,
        new FixedString(variable.value as string, variable.size)
      );
    });

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    const r1Address = memory.allocateStack(1);
    memory.writePointer(r1Address, sAddress);

    const r2Address = memory.allocateStack(1);
    memory.writePointer(r2Address, sAddress);

    const lenAddress = memory.allocateStack(1);
    const firstAddress = memory.allocateStack(1);

    const s2address = memory.allocateStack(1);
    memory.writePointer(s2address, sAddress);
    const getLenAddress = memory.allocateStack(1);
    const getLenValue = variableSizeRust;
    memory.writeByte(getLenAddress, getLenValue);
    memory.writeByte(lenAddress, getLenValue);
    memory.freeStack(getLenAddress);
    memory.freeStack(s2address);

    const s3address = memory.allocateStack(1);
    memory.writePointer(s3address, sAddress);
    const getFirstAddress = memory.allocateStack(1);
    const getFirstValue = 0x68;
    memory.writeByte(getFirstAddress, getFirstValue);
    memory.writeByte(firstAddress, getFirstValue);
    memory.freeStack(getFirstAddress);
    memory.freeStack(s3address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let s = String::from("hi");
    
    let r1 = &s; // immutable borrow
    let r2 = &s; // another immutable borrow
    
    let len = get_length(r1);
    let first = get_first_char(r2);
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr (OWNER)",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "r1 (&)",
          address: r1Address,
          size: 1,
          value: sAddress,
        },
        {
          name: "r2 (&)",
          address: r2Address,
          size: 1,
          value: sAddress,
        },
        {
          name: "len",
          address: lenAddress,
          size: 1,
          value: getLenValue,
        },
        {
          name: "first",
          address: firstAddress,
          size: 1,
          value: getFirstValue,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "get_length()",
      `fn get_length(s2: &String) -> usize {
    s2.len()
}`,
      "rust",
      s2address,
      [
        {
          name: "s2",
          address: s2address,
          size: 1,
          value: sAddress,
        },
        {
          name: "s2.len()",
          address: getLenAddress,
          size: 1,
          value: getLenValue,
        },
      ]
    );

    stackThree = new StackFrame(
      memory,
      "get_first_char()",
      `fn get_first_char(s3: &String) -> Option<char> {
    s3.chars().next()
}`,
      "rust",
      s3address,
      [
        {
          name: "s3",
          address: s3address,
          size: 1,
          value: sAddress,
        },
        {
          name: "s3.chars().next()",
          address: getFirstAddress,
          size: 1,
          value: getFirstValue,
        },
      ]
    );
  }

  function oneMutDemo(): void {
    console.log("oneMutDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "One Mutable Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "HI",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("h" as string, 1)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, 1);
    memory.writeByte(sCap, 1);

    const s2address = memory.allocateStack(1);
    memory.writePointer(s2address, sAddress);

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, 2)
    );

    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.freeStack(s2address);

    const s3address = memory.allocateStack(1);
    memory.writePointer(s3address, sAddress);

    memory.writeString(
      heapVariables[0].address,
      new FixedString("HI" as string, 2)
    );

    memory.freeStack(s3address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let mut s = String::from("h");
    
    add_letter(&mut s); // mutable borrow (starts and ends here)
    make_uppercase(&mut s); // another mutable borrow (OK: previous one ended)
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr (OWNER)",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "add_letter()",
      `fn add_letter(s: &mut String) {
    s.push_str("i");
}`,
      "rust",
      s2address,
      [
        {
          name: "s",
          address: s2address,
          size: 1,
          value: sAddress,
        },
      ]
    );

    stackThree = new StackFrame(
      memory,
      "make_uppercase()",
      `fn make_uppercase(s: &mut String) {
    *s = s.to_uppercase();
}`,
      "rust",
      s3address,
      [
        {
          name: "s",
          address: s3address,
          size: 1,
          value: sAddress,
        },
      ]
    );
  }

  function mixingMutDemo(): void {
    console.log("mixingMutDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Mixing Mutable and Immutable Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("h" as string, 1)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, 1);
    memory.writeByte(sCap, 1);

    const rAddress = memory.allocateStack(1);
    memory.writePointer(rAddress, sAddress);

    const s2address = memory.allocateStack(1);
    memory.writePointer(s2address, sAddress);

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, 2)
    );

    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.freeStack(s2address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let mut s = String::from("h");
    
    let r = &s; // immutable borrow
    add_letter(&mut s); // ✗ ERROR: can't borrow as mutable while r exists
    
    println!("{}", r);
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr (OWNER)",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "r (&)",
          address: rAddress,
          size: 1,
          value: sAddress,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "add_letter()",
      `fn add_letter(s: &mut String) {
    s.push_str("i");
}`,
      "rust",
      s2address,
      [
        {
          name: "s",
          address: s2address,
          size: 1,
          value: sAddress,
        },
      ]
    );
  }

  function multiMutDemo(): void {
    console.log("multiMutDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Multiple Mutable Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("h" as string, 1)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, 1);
    memory.writeByte(sCap, 1);

    const rAddress = memory.allocateStack(1);
    memory.writePointer(rAddress, sAddress);

    const s2address = memory.allocateStack(1);
    memory.writePointer(s2address, sAddress);

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, 2)
    );

    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.freeStack(s2address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let mut s = String::from("h");
    
    let r = &mut s; // first mutable borrow
    add_letter(&mut s); // ✗ ERROR: can't borrow as mutable (r still active)
    
    println!("{}", r);
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr (OWNER)",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "r (&mut)",
          address: rAddress,
          size: 1,
          value: sAddress,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "add_letter()",
      `fn add_letter(s: &mut String) {
    s.push_str("i");
}`,
      "rust",
      s2address,
      [
        {
          name: "s",
          address: s2address,
          size: 1,
          value: sAddress,
        },
      ]
    );
  }

  function validScopeDemo(): void {
    console.log("validScopeDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Valid Scope Demo";

    const variableSizeRust = 2;

    const s2Address = memory.allocateStack(1);
    memory.writePointer(s2Address, 0);
    const s2Len = memory.allocateStack(1);
    memory.writeByte(s2Len, 0);
    const s2Cap = memory.allocateStack(1);
    memory.writeByte(s2Cap, 0);

    const rAddress = memory.allocateStack(1);
    memory.writePointer(rAddress, 0);

    const sAddress = memory.allocateStack(1);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, variableSizeRust)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, variableSizeRust);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, variableSizeRust);

    memory.writePointer(s2Address, heapVariables[0].address);
    memory.writeByte(s2Len, variableSizeRust);
    memory.writeByte(s2Cap, variableSizeRust);

    memory.freeStack(sCap);
    memory.freeStack(sLen);
    memory.freeStack(sAddress);

    memory.writePointer(rAddress, s2Address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let s2 = get_owned();
    let r = &s2; // ✓ OK: s is valid here
}`,
      "rust",
      s2Address,
      [
        {
          name: "s2:ptr",
          address: s2Address,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s2:len",
          address: s2Len,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s2:capacity",
          address: s2Cap,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "r (&)",
          address: rAddress,
          size: 1,
          value: s2Address,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "get_owned()",
      `fn get_owned() -> String {
    let s = String::from("hi");
    s // return owned String (not a reference)
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );
  }

  function danglingRefDemo(): void {
    console.log("danglingRefDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Dangling Reference Demo";

    const variableSizeRust = 2;

    const rAddress = memory.allocateStack(1);
    memory.writePointer(rAddress, 0);

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, variableSizeRust)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.writePointer(rAddress, sAddress);

    memory.freeStack(sCap);
    memory.freeStack(sLen);
    memory.freeStack(sAddress);
    memory.free(heapVariables[0].address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let r = get_dangling_reference();
}`,
      "rust",
      rAddress,
      [
        {
          name: "r (&)",
          address: rAddress,
          size: 1,
          value: sAddress,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "get_dangling_reference()",
      `fn get_dangling_reference() -> &String {
    let s = String::from("hi");
    &s // ✗ ERROR: returning reference to local variable
} // s is dropped here, reference would be invalid`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );
  }

  function refOutlivesDemo(): void {
    console.log("refOutlivesDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Reference Outlives Demo";

    const variableSizeRust = 2;

    const rAddress = memory.allocateStack(1);
    memory.writePointer(rAddress, 0);

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const lenAddress = memory.allocateStack(1);
    const s2address = memory.allocateStack(1);
    const getLenAddress = memory.allocateStack(1);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, variableSizeRust)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.writePointer(rAddress, sAddress);

    memory.freeStack(sCap);
    memory.freeStack(sLen);
    memory.freeStack(sAddress);
    memory.free(heapVariables[0].address);

    memory.writePointer(s2address, rAddress);
    memory.writeByte(getLenAddress, 0);
    memory.writeByte(lenAddress, 0);
    memory.freeStack(getLenAddress);
    memory.freeStack(s2address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let r;
    {
        let s = String::from("hi");
        r = &s; // ✗ ERROR: s doesn't live long enough
    } // s is dropped here
    
    let len = get_length(r); // r would be dangling
}`,
      "rust",
      rAddress,
      [
        {
          name: "r (&)",
          address: rAddress,
          size: 1,
          value: sAddress,
        },
        {
          name: "s",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "len",
          address: lenAddress,
          size: 1,
          value: 0,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "get_length()",
      `fn get_length(s2: &String) -> usize {
    s2.len()
}`,
      "rust",
      s2address,
      [
        {
          name: "s2",
          address: s2address,
          size: 1,
          value: sAddress,
        },
        {
          name: "s2.len()",
          address: getLenAddress,
          size: 1,
          value: 0,
        },
      ]
    );
  }

  function returnOwnerDemo(): void {
    console.log("returnOwnerDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Returning Ownership Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const sNewAddress = memory.allocateStack(1);
    memory.writePointer(sNewAddress, 0);
    const sNewLen = memory.allocateStack(1);
    memory.writeByte(sNewLen, 0);
    const sNewCap = memory.allocateStack(1);
    memory.writeByte(sNewCap, 0);

    const s2Address = memory.allocateStack(1);
    memory.writePointer(s2Address, 0);
    const s2Len = memory.allocateStack(1);
    memory.writeByte(s2Len, 0);
    const s2Cap = memory.allocateStack(1);
    memory.writeByte(s2Cap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, variableSizeRust)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.writePointer(s2Address, heapVariables[0].address);
    memory.writeByte(s2Len, variableSizeRust);
    memory.writeByte(s2Cap, variableSizeRust);

    memory.writePointer(sNewAddress, heapVariables[0].address);
    memory.writeByte(sNewLen, variableSizeRust);
    memory.writeByte(sNewCap, variableSizeRust);

    memory.freeStack(s2Cap);
    memory.freeStack(s2Len);
    memory.freeStack(s2Address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let s = String::from("hi");
    let s = take_and_return(s); // move ownership in, then back out
    
    println!("{}", s); // ✓ OK: we own s again
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr",
          address: sNewAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sNewLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sNewCap,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "take_and_return()",
      `fn take_and_return(s2: String) -> String {
    println!("{}", s2);
    s2 // return ownership back
}`,
      "rust",
      sAddress,
      [
        {
          name: "s2:ptr",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s2:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s2:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );
  }

  function useAfterMoveDemo(): void {
    console.log("useAfterMoveDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Use After Move Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const lenAddress = memory.allocateStack(1);

    const s2Address = memory.allocateStack(1);
    memory.writePointer(s2Address, 0);
    const s2Len = memory.allocateStack(1);
    memory.writeByte(s2Len, 0);
    const s2Cap = memory.allocateStack(1);
    memory.writeByte(s2Cap, 0);

    const getLenOwnedAddress = memory.allocateStack(1);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s",
        address: memory.allocate(variableSizeRust),
        size: variableSizeRust,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("hi" as string, variableSizeRust)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.writePointer(s2Address, heapVariables[0].address);
    memory.writeByte(s2Len, variableSizeRust);
    memory.writeByte(s2Cap, variableSizeRust);

    memory.writeByte(getLenOwnedAddress, variableSizeRust);
    memory.writeByte(lenAddress, variableSizeRust);
    memory.freeStack(getLenOwnedAddress);
    memory.free(heapVariables[0].address);
    memory.freeStack(s2Cap);
    memory.freeStack(s2Len);
    memory.freeStack(s2Address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let s = String::from("hi");
    let len = get_len_owned(s); // s is moved into function
    
    println!("Length: {}", len);
    println!("{}", s); // ✗ ERROR: s was moved, no longer valid
}`,
      "rust",
      sAddress,
      [
        {
          name: "s:ptr",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s:len",
          address: sLen,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s:capacity",
          address: sCap,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "len",
          address: lenAddress,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "get_len_owned()",
      `fn get_len_owned(s2: String) -> usize {
    s2.len()
} // s is dropped here`,
      "rust",
      sAddress,
      [
        {
          name: "s2:ptr",
          address: s2Address,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s2:len",
          address: s2Len,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s2:capacity",
          address: s2Cap,
          size: 1,
          value: variableSizeRust,
        },
        {
          name: "s2.len()",
          address: getLenOwnedAddress,
          size: 1,
          value: variableSizeRust,
        },
      ]
    );
  }

  function lifetimeAnnotationDemo(): void {
    console.log("lifetimeAnnotationDemo");
    doAutoCollapseNav();
    resetAndDisableGc();
    title = "Lifetime Annotations Demo";

    const variableSizeRust = 2;

    const sAddress = memory.allocateStack(1);
    memory.writePointer(sAddress, 0);
    const sLen = memory.allocateStack(1);
    memory.writeByte(sLen, 0);
    const sCap = memory.allocateStack(1);
    memory.writeByte(sCap, 0);

    const resultAddress = memory.allocateStack(1);
    memory.writePointer(resultAddress, 0);

    const s2Address = memory.allocateStack(1);
    memory.writePointer(s2Address, 0);
    const s2Len = memory.allocateStack(1);
    memory.writeByte(s2Len, 0);
    const s2Cap = memory.allocateStack(1);
    memory.writeByte(s2Cap, 0);

    const heapVariables: Array<FrameVariable> = [
      {
        name: "s1",
        address: memory.allocate(1),
        size: 1,
        value: "h",
      },
      {
        name: "s2",
        address: memory.allocate(2),
        size: 2,
        value: "hi",
      },
    ];

    memory.writeString(
      heapVariables[0].address,
      new FixedString("h" as string, 1)
    );

    memory.writeString(
      heapVariables[1].address,
      new FixedString("hi" as string, 2)
    );

    heap = new Heap(memory, heapVariables);

    memory.writePointer(sAddress, heapVariables[0].address);
    memory.writeByte(sLen, variableSizeRust);
    memory.writeByte(sCap, variableSizeRust);

    memory.writePointer(s2Address, heapVariables[0].address);
    memory.writeByte(s2Len, variableSizeRust);
    memory.writeByte(s2Cap, variableSizeRust);

    const xAddress = memory.allocateStack(1);
    memory.writePointer(xAddress, sAddress);
    const yAddress = memory.allocateStack(1);
    memory.writePointer(yAddress, s2Address);
    const longestValueAddress = memory.allocateStack(1);

    memory.writeByte(longestValueAddress, s2Address);
    memory.writePointer(resultAddress, s2Address);
    memory.freeStack(longestValueAddress);
    memory.freeStack(yAddress);
    memory.freeStack(xAddress);
    memory.free(heapVariables[1].address);
    memory.freeStack(s2Cap);
    memory.freeStack(s2Len);
    memory.freeStack(s2Address);

    stackOne = new StackFrame(
      memory,
      "main()",
      `fn main() {
    let s1 = String::from("h");
    let result;
    {
        let s2 = String::from("hi");
        result = longest(&s1, &s2);
        // s2 is dropped here - but result points to it!
    }
    // ERROR: result points to the dropped s2
    println!("{}", result);
}`,
      "rust",
      sAddress,
      [
        {
          name: "s1:ptr",
          address: sAddress,
          size: 1,
          value: heapVariables[0].address,
        },
        {
          name: "s1:len",
          address: sLen,
          size: 1,
          value: 1,
        },
        {
          name: "s1:capacity",
          address: sCap,
          size: 1,
          value: 1,
        },
        {
          name: "result (&)",
          address: resultAddress,
          size: 1,
          value: s2Address,
        },
        {
          name: "s2:ptr",
          address: s2Address,
          size: 1,
          value: heapVariables[1].address,
        },
        {
          name: "s2:len",
          address: s2Len,
          size: 2,
          value: 2,
        },
        {
          name: "s2:capacity",
          address: s2Cap,
          size: 2,
          value: 2,
        },
      ]
    );

    stackTwo = new StackFrame(
      memory,
      "longest()",
      `/**
 * The lifetime annotation 'a means:
 * "The returned reference is valid for as long as BOTH x AND y are valid"
 */
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}`,
      "rust",
      sAddress,
      [
        {
          name: "x (&)",
          address: xAddress,
          size: 1,
          value: sAddress,
        },
        {
          name: "y (&)",
          address: yAddress,
          size: 1,
          value: s2Address,
        },
        {
          name: "x.len() > y.len()",
          address: longestValueAddress,
          size: 1,
          value: 2,
        },
      ]
    );
  }

  // ==============
  // Helpers
  // ==============
  function login(): void {
    console.log("login");

    allocateUserAndSession();

    user = new UserStruct(memory, userAddress);

    memory.writeString(
      user.usernameAddress,
      new FixedString("alice", UserStruct.USERNAME_SIZE)
    );

    memory.writeString(
      user.passwordAddress,
      new FixedString("secret", UserStruct.PASSWORD_SIZE)
    );

    memory.writeInt32(user.isAdminAddress, new Int32(0));

    createSession(userAddress);
  }

  function logout(): void {
    console.log("logout");

    if (userAddress === -1 || !user) {
      console.warn("No user to logout");
      return;
    }

    // Free the User memory (like free() in C)
    // This creates a Dangling Pointer in the Session
    memory.free(userAddress);
  }

  function allocateUserAndSession(): void {
    userAddress = memory.allocate(UserStruct.USER_STRUCT_SIZE);

    if (userAddress === -1) {
      console.error("Failed to allocate User");
      return;
    }

    sessionAddress = memory.allocate(SessionStruct.SESSION_STRUCT_SIZE);

    if (sessionAddress === -1) {
      console.error("Failed to allocate Session");
      return;
    }
  }

  function createSession(userAddr: number): void {
    console.log("createSession");

    session = new SessionStruct(memory, sessionAddress);

    memory.writeInt32(session.sessionIdAddress, new Int32(1));
    // memory.writeInt32(session.userPointerAddress, new Int32(userAddr));
    memory.writePointer(session.userPointerAddress, userAddr);

    if (memory.isGcEnabled) {
      const ok = memory.addRef(userAddr);
      if (!ok) {
        console.warn("addRef failed; address not allocated?");
      }
    }

    loginStack();
  }

  function closeSession(): void {
    console.log("closeSession");

    if (sessionAddress === -1 || !session) {
      console.warn("No session to close");
      return;
    }

    // Decrement the user reference
    if (session.userPointer !== -1) {
      // This decrements refCount from 1 → 0
      // sweepIfNeeded() will NOW deallocate the user memory
      memory.free(session.userPointer);
    }

    // Free the session itself
    memory.free(sessionAddress);

    // session = null;
    // sessionAddress = -1;
    // userAddress = -1; // Clear the dangling pointer
  }

  function loginStack() {
    let userVarAddress = memory.allocateStack(1);
    memory.writePointer(userVarAddress, userAddress);

    let sessionVarAddress = memory.allocateStack(1);
    memory.writePointer(sessionVarAddress, sessionAddress);

    stackOne = new StackFrame(
      memory,
      "login",
      "strncpy(user->username, username_start, sizeof(user->username) - 1);\nmemcpy(user->password, password_start, password_len);\nsession->session_id = next_session_id++;\nsession->user = user;",
      "c",
      userVarAddress,
      [
        {
          name: "user",
          address: userVarAddress,
          size: 1,
          value: userAddress,
        },
        {
          name: "session",
          address: sessionVarAddress,
          size: 1,
          value: sessionAddress,
        },
      ]
    );
  }

  function doAutoCollapseNav(): void {
    if (autoCollapseNav) {
      navExpanded = false;
    }
  }

  function resetAndDisableGc(): void {
    resetMemoryAction();
    memory.enableGc(false);
    memoryVisualizerRef.collapseBytes();
  }

  function clearMemory(): void {
    console.log("clearMemory");

    memory.clearMemory();
    stackOneAddress = -1;
    stackOne = null;

    stackTwoAddress = -1;
    stackTwo = null;

    stackThreeAddress = -1;
    stackThree = null;

    heap = null;

    userAddress = -1;
    user = null;

    sessionAddress = -1;
    session = null;

    title = "";

    // navExpanded = false;
    memoryVisualizerRef.collapseBytes();
  }

  function normalLoginAction(): void {
    doAutoCollapseNav();
    resetAndDisableGc();
    login();
    title = "Normal Login";
  }

  function clearAllMemoryAction(): void {
    memory.enableGc(false);
    clearMemory();
  }

  function resetMemoryAction(): void {
    console.log("resetMemory");
    clearAllMemoryAction();
    memory.resetMemory();
  }
</script>

<div class="container-fluid bg-light h-100 overflow-auto">
  <div class="row h-100">
    {#if navExpanded}
      <div class="p-4 bg-dark col-sm-3 col-xxl-2 overflow-y-scroll h-100">
        <div>
          <button
            type="button"
            class="btn btn-sm btn-outline-light"
            onclick={() => (navExpanded = false)}
          >
            Menu
          </button>
        </div>

        <h4 class="text-gradient mt-3">Memory Visualizer</h4>

        <p class="text-light text-opacity-75 mt-2">
          Write data to memory and step through snapshots to see changes.
        </p>

        <p class="text-light text-opacity-75 mt-3">
          By <a
            class="text-light text-gradient text-decoration-none"
            href="https://github.com/matthewhaynesonline"
            target="_blank"
          >
            @matthewhaynesonline
          </a>

          <br />

          <a
            class="text-light text-gradient text-decoration-none"
            href="https://github.com/matthewhaynesonline/Memory-Safety-Demo"
            target="_blank"
          >
            Repo
          </a>

          <br />

          <a
            class="text-light text-gradient text-decoration-none"
            href="https://youtu.be/kN6AtVm7b3w"
            target="_blank"
          >
            Video Guide
          </a>
        </p>

        <div class="actions mt-4">
          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Demo Settings</small>
          </h6>

          <div class="form-check form-switch mt-3" data-bs-theme="dark">
            <input
              class="form-check-input"
              type="checkbox"
              id="autoCollapseNavSwitch"
              switch
              bind:checked={autoCollapseNav}
              onchange={() => {
                saveSetting(autoCollapseNavKey, autoCollapseNav);
              }}
            />

            <label
              class="form-check-label text-light"
              for="autoCollapseNavSwitch"
            >
              <small>Hide Nav on Start</small>
            </label>
          </div>

          <div class="form-check form-switch mt-3" data-bs-theme="dark">
            <input
              class="form-check-input"
              type="checkbox"
              id="showCodebyDefaultSwitch"
              switch
              bind:checked={showCodeByDefault}
              onchange={() => {
                saveSetting(showCodeByDefaultKey, showCodeByDefault);
              }}
            />

            <label
              class="form-check-label text-light"
              for="showCodebyDefaultSwitch"
            >
              <small>Show Code on Start</small>
            </label>
          </div>

          <hr class="text-light text-opacity-25 my-4" />

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Memory Demos</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={bitsDemo}
              >
                Bits
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={pointersDemo}
              >
                Pointers
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={stackFrameDemo}
              >
                Stack Frames
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={heapDemo}
              >
                Heap
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={fatPointerDemo}
              >
                Fat Pointer
              </button>
            </li>
          </ul>

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Passing</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={passByValueDemo}
              >
                Pass by Value
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={passByReferenceDemo}
              >
                Pass by Reference
              </button>
            </li>
          </ul>

          <hr class="text-light text-opacity-25 my-4" />

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Buffer Overflow</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={simpleOverflowDemo}
              >
                <span class="text-warning font-monospace">!</span> Simple Overflow
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={preciseOverflowDemo}
              >
                <span class="text-warning font-monospace">!</span> Precise Overflow
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={simpleOverflowBoundsCheckDemo}
              >
                <span class="text-success font-monospace">✓</span> Simple Overflow
                Bounds Checking
              </button>
            </li>
          </ul>

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Dangling Pointer</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={uafDemo}
              >
                <span class="text-warning font-monospace">!</span> Login Logout UAF
                Dangling Pointer
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={gcDemo}
              >
                <span class="text-success font-monospace">✓</span> Login Logout with
                Garbage Collector
              </button>
            </li>
          </ul>

          <hr class="text-light text-opacity-25 my-4" />

          <h6 class="text-light text-uppercase text-opacity-50 mb-3">
            <small>Borrow Checker</small>
          </h6>

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Ref Mutability</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={manyImmutDemo}
              >
                <span class="text-success font-monospace">✓</span> Many Immutable
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={oneMutDemo}
              >
                <span class="text-success font-monospace">✓</span> One Mutable
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={mixingMutDemo}
              >
                <span class="text-warning font-monospace">!</span> Mixing Mutable
                and Immutable
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={multiMutDemo}
              >
                <span class="text-warning font-monospace">!</span> Multiple Mutable
              </button>
            </li>
          </ul>

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Lifetimes</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={validScopeDemo}
              >
                <span class="text-success font-monospace">✓</span> Reference Valid
                Scope
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={danglingRefDemo}
              >
                <span class="text-warning font-monospace">!</span> Dangling Reference
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={refOutlivesDemo}
              >
                <span class="text-warning font-monospace">!</span> Reference Outlives
              </button>
            </li>
          </ul>

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Ownership</small>
          </h6>

          <ul class="list-unstyled">
            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={returnOwnerDemo}
              >
                <span class="text-success font-monospace">✓</span> Returning Ownership
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={useAfterMoveDemo}
              >
                <span class="text-warning font-monospace">!</span> Using After Move
              </button>
            </li>

            <li>
              <button
                type="button"
                class="btn btn-sm btn-outline-light"
                onclick={lifetimeAnnotationDemo}
              >
                <span class="text-warning font-monospace">!</span> Lifetime Annotations
              </button>
            </li>
          </ul>

          <hr class="text-light text-opacity-25 my-4" />

          <h6 class="text-light text-uppercase text-opacity-50">
            <small>Actions</small>
          </h6>

          <div class="d-grid gap-2 action-buttons">
            <button
              type="button"
              class="btn btn-outline-light my-1"
              onclick={normalLoginAction}
            >
              Normal Login
            </button>

            <button
              type="button"
              class="btn btn-outline-light my-1"
              onclick={clearAllMemoryAction}
            >
              Clear All Memory
            </button>

            <button
              type="button"
              class="btn btn-outline-danger border-danger-subtle my-1"
              onclick={resetMemoryAction}
            >
              Reset All Memory
            </button>

            <button
              type="button"
              class="btn btn-primary bg-gradient my-1"
              onclick={() => {
                showMemoryInput = !showMemoryInput;
              }}
            >
              Write to Memory
            </button>
          </div>

          {#if showMemoryInput}
            <div class="card mem-input-wrapper mt-3" data-bs-theme="dark">
              <div class="card-body">
                <MemoryInput {memory} />
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div
      class="overflow-y-scroll h-100 {navExpanded
        ? 'col-sm-9 col-xxl-10'
        : 'col'}"
    >
      {#if !navExpanded}
        <button
          type="button"
          class="btn btn-sm btn-dark ms-3 mt-4"
          onclick={() => (navExpanded = true)}
        >
          Menu
        </button>
      {/if}

      <div class="row mx-1 mt-4">
        {#if sidePanelActive}
          <div class="col-sm-3">
            {#if stackOne}
              <StackFrameComponent
                stackFrame={stackOne}
                showCodeAsExpanded={showCodeByDefault}
              />
            {/if}

            {#if stackTwo}
              <div class="mt-4">
                <StackFrameComponent
                  stackFrame={stackTwo}
                  showCodeAsExpanded={showCodeByDefault}
                />
              </div>
            {/if}

            {#if stackThree}
              <div class="mt-4">
                <StackFrameComponent
                  stackFrame={stackThree}
                  showCodeAsExpanded={showCodeByDefault}
                />
              </div>
            {/if}

            {#if heap}
              <div class="mt-4">
                <HeapComponent {heap} />
              </div>
            {/if}

            {#if user}
              <div class="">
                <div class="mt-4">
                  <User {user} showCodeAsExpanded={showCodeByDefault} />
                </div>
              </div>
            {/if}

            {#if user && session}
              <div class="mt-4">
                <Session
                  {user}
                  {session}
                  showCodeAsExpanded={showCodeByDefault}
                />
              </div>
            {/if}

            {#if memory.isGcEnabled}
              <div class="mt-4">
                <Gc {memory} />
              </div>
            {/if}
          </div>
        {/if}

        <div class={sidePanelActive ? "col-sm-9" : "col"}>
          <MemoryVisualizer {title} {memory} bind:this={memoryVisualizerRef} />
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .actions .btn {
    text-align: start;
  }

  .actions :not(.action-buttons) .btn {
    border-color: transparent !important;
  }

  .actions .action-buttons .btn {
    border-color: rgba(255, 255, 255, 0.25);
  }

  .actions .btn-outline-danger {
    color: var(--bs-danger-border-subtle) !important;
  }

  .actions .btn-outline-danger:hover {
    color: white !important;
    background-color: var(--bs-danger-border-subtle) !important;
  }

  .mem-input-wrapper {
    background-color: #404040;
  }
</style>

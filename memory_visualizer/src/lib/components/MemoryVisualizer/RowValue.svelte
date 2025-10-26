<script lang="ts">
  import { DisplayType, formatHex } from "../../memory.svelte";
  import { type RowByte } from "./types.svelte";

  let {
    bytes,
    displayMode = DisplayType.Hex,
  }: {
    bytes: Array<RowByte>;
    displayMode?: DisplayType;
  } = $props();

  let hexValue = $derived.by(() => {
    let value = 0n;

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i].byte.value);
    }

    return formatHex(value);
  });

  let intValue = $derived.by(() => {
    let value = 0n;

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i].byte.value);
    }

    return value.toString();
  });

  let stringValue = $derived.by(() => {
    return bytes
      .map((b) => {
        const val = b.byte.value;
        return val >= 32 && val < 127 ? String.fromCharCode(val) : "·";
      })
      .join("");
  });

  let displayValue = $derived(
    displayMode === "hex"
      ? hexValue
      : displayMode === "int"
        ? intValue
        : stringValue
  );

  let badgeClass = $derived(
    displayMode === DisplayType.Hex
      ? "bg-info-subtle text-info-emphasis"
      : displayMode === DisplayType.Int
        ? "bg-success-subtle text-success-emphasis"
        : "bg-warning-subtle text-warning-emphasis"
  );

  function cycleMode() {
    if (displayMode === DisplayType.Hex) displayMode = DisplayType.Int;
    else if (displayMode === DisplayType.Int) displayMode = DisplayType.String;
    else displayMode = DisplayType.Hex;
  }
</script>

<div
  class="row-value ms-3 font-monospace text-secondary"
  onclick={cycleMode}
  title="Click to cycle between Hex, Int, and String"
>
  <span class="badge {badgeClass}">{displayMode}</span>

  <div class="row-value-display">
    {displayValue}
  </div>
</div>

<style>
  .row-value {
    min-width: 200px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .row-value-display {
    word-break: break-all;
  }
</style>

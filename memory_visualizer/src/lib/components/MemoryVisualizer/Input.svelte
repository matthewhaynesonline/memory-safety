<script lang="ts">
  import { Memory } from "../../memory.svelte";

  let { memory }: { memory: Memory } = $props();

  let error = $state("");

  let maxAddress = $derived(memory.size - 1);

  let address = $state(0);
  let parsedAddress = $derived(parseInt(address));

  let byteValue = $state(0);
  let parsedValue = $derived(parseInt(byteValue));

  function handleWrite() {
    error = "";

    try {
      if (isNaN(parsedAddress) || parsedAddress < 0) {
        error = "Invalid address";
        return;
      }

      if (isNaN(parsedValue) || parsedValue < 0 || parsedValue > 255) {
        error = "Byte value must be between 0 and 255";
        return;
      }

      memory.writeByte(parsedAddress, parsedValue);
    } catch (e) {
      error = e.message;
    }
  }

  function handleClear() {
    try {
      if (isNaN(parsedAddress) || parsedAddress < 0) {
        error = "Invalid address";
        return;
      }

      memory.writeByte(parsedAddress, 0);
    } catch (e) {
      error = e.message;
    }
  }
</script>

{#if error}
  <div class="alert alert-danger" role="alert">
    {error}
  </div>
{/if}

<div class="row">
  <div class="col">
    <label class="form-label text-light" for="mem-address"> Address </label>

    <input
      type="number"
      class="form-control"
      id="mem-address"
      min="0"
      max={maxAddress}
      placeholder="0"
      bind:value={address}
    />

    <small class="form-text">0-{maxAddress}</small>
  </div>

  <div class="col">
    <label class="form-label text-light" for="mem-value"> Value </label>

    <input
      type="number"
      class="form-control"
      id="mem-value"
      min="0"
      max="255"
      placeholder="0-255"
      bind:value={byteValue}
    />

    <small class="form-text">0-255</small>
  </div>
</div>

<div class="row mt-4">
  <div class="col">
    <button
      type="button"
      class="btn btn-primary bg-gradient w-100"
      onclick={handleWrite}
    >
      Write
    </button>
  </div>

  <div class="col">
    <button type="button" class="btn btn-dark w-100" onclick={handleClear}>
      Clear
    </button>
  </div>
</div>

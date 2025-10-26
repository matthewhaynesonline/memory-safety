<script lang="ts">
  import { formatHex, getAddressRangeDisplay } from "../memory.svelte";

  import { StackFrame } from "../stack_frame_heap.svelte";

  import CodeSnippetWrapper from "./CodeSnippetWrapper.svelte";

  let {
    stackFrame,
    showCodeAsExpanded = false,
  }: { stackFrame: StackFrame; showCodeAsExpanded?: boolean } = $props();

  let startingAddress = $derived(formatHex(stackFrame.baseAddress));

  let addressRange = $derived(
    getAddressRangeDisplay(stackFrame.baseAddress, 0, stackFrame.size)
  );
</script>

<div class="card border-0 shadow p-2">
  <div class="card-body pb-0">
    <h5 class="border-start border-4 border-danger-subtle ps-2">
      {stackFrame.name}

      <small>
        <span class="font-monospace">
          {startingAddress} ({addressRange})
        </span>
      </small>
    </h5>

    <CodeSnippetWrapper
      code={stackFrame.codeSnippet}
      language={stackFrame.codeSnippetLanguage}
      {showCodeAsExpanded}
    />

    <div class="d-inline-block w-100 mt-3 mb-2">
      <span class="badge text-success-emphasis bg-success-subtle float-end">
        {stackFrame.size} Bytes
      </span>
    </div>

    {#each stackFrame.variables as variable}
      <div class="card bg-light border border-light-subtle p-0 mb-4">
        <div class="card-body">
          <div class="row">
            <div class="col font-monospace">
              <span class="text-success">{variable.name}</span>

              <span
                class="badge text-body-secondary bg-secondary-subtle float-end"
              >
                {#if variable.size === 1}
                  {variable.address}
                {:else}
                  {getAddressRangeDisplay(variable.address, 0, variable.size)}
                {/if}
              </span>
            </div>
          </div>

          <div class="row">
            <div class="col">{variable.value}</div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<script lang="ts">
  import { codeToHtml, type BundledLanguage, type BundledTheme } from "shiki";
  import { onMount } from "svelte";

  let {
    code = "",
    language = "c",
    theme = "github-dark",
  }: {
    code?: string;
    language?: BundledLanguage;
    theme?: BundledTheme;
  } = $props();

  let highlightedCode = $state<string>("");
  let isLoading = $state<boolean>(true);

  async function highlightCode(): Promise<void> {
    isLoading = true;

    try {
      highlightedCode = await codeToHtml(code, {
        lang: language,
        theme: theme,
      });
    } catch (error) {
      console.error("Syntax highlighting error:", error);

      highlightedCode = `<pre><code>${code}</code></pre>`;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    highlightCode();
  });

  $effect(() => {
    highlightCode();
  });

  async function copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }
</script>

<div class="card border-0 shadow rounded-1">
  <div
    class="card-header bg-dark text-light d-flex justify-content-between align-items-center py-2"
  >
    <span class="font-monospace small text-secondary">{language}</span>
    <button
      onclick={copyToClipboard}
      class="btn btn-sm btn-outline-secondary"
      type="button"
    >
      Copy
    </button>
  </div>

  <div class="card-body p-0 bg-dark">
    {#if isLoading}
      <div class="text-center text-secondary py-5">
        <div class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        Loading...
      </div>
    {:else}
      <div class="code-wrapper">
        {@html highlightedCode}
      </div>
    {/if}
  </div>
</div>

<style>
  .card-body {
    border-radius: 0 0 var(--bs-card-inner-border-radius)
      var(--bs-card-inner-border-radius);
  }

  .code-wrapper :global(pre) {
    margin: 0 !important;
    padding: 1rem !important;
    overflow-x: auto;
    background: transparent !important;
  }
</style>

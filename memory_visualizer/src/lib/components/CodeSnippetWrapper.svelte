<script lang="ts">
  import { type BundledLanguage } from "shiki";

  import CodeSnippet from "./CodeSnippet.svelte";

  let {
    code = "",
    language = "c",
    showCodeAsExpanded = false,
  }: {
    code?: string;
    language?: BundledLanguage;
    showCodeAsExpanded?: boolean;
  } = $props();

  // Only change the details open when the demo changes,
  // not when the setting changes and we may still be on the same demo
  // Hacky, but attempt that by syncing the setting when the code changes
  let codeNonSyncedCopy = code;
  let showCodeAsExpandedNonSyncedCopy = $state(showCodeAsExpanded);

  $effect(() => {
    if (codeNonSyncedCopy != code) {
      codeNonSyncedCopy = code;
      showCodeAsExpandedNonSyncedCopy = showCodeAsExpanded;
    }
  });
</script>

{#if showCodeAsExpandedNonSyncedCopy}
  <details open>
    <summary>Example Code</summary>

    <CodeSnippet {code} {language} />
  </details>
{:else}
  <details>
    <summary>Example Code</summary>

    <CodeSnippet {code} {language} />
  </details>
{/if}

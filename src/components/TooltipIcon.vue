<script setup lang="ts">
defineProps<{ texto?: string }>()
</script>

<template>
  <!-- Solo se renderiza si se le pasa un texto -->
  <span v-if="texto" class="tooltip-container" :title="texto">
    <span class="help-icon">?</span>
  </span>
</template>

<style scoped>
.tooltip-container {
  display: inline-flex;
  vertical-align: middle;
}

.help-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--color-input-border);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: help;
  margin-left: 6px;
  transition: background-color 0.2s, color 0.2s;
}

.help-icon:hover {
  background-color: var(--color-primary);
  color: #ffffff;
}
</style>
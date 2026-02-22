<!-- Root layout that imports global styles and renders child routes. -->
<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

{@render children()}

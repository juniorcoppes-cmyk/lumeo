export default function Loading() {
  return (
    <main className="mx-auto flex max-w-3xl justify-center px-6 py-24">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent"
        role="status"
        aria-label="Carregando"
      />
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Panda.ai</h1>
      <p className="text-lg text-muted-foreground mb-8">
        AI-powered coding workbench
      </p>
      <Link
        href="/projects"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        View Projects
      </Link>
    </main>
  );
}

import { Features } from '../components/Features';
import { Footer } from '../components/Footer';
import { Hero } from '../components/Hero';
import { ProblemSolution } from '../components/ProblemSolution';

export function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <ProblemSolution />
      <Footer />
    </main>
  );
}
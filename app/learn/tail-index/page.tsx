import type { Metadata } from "next";
import { HillLab } from "@/components/labs/HillLab";

export const metadata: Metadata = {
  title: "How heavy is the tail, and how sure am I? — CMQuant",
  description:
    "The Hill estimator as a plot across k, not a single number. Stability, bias and the sample you cannot see.",
};

export default function TailIndexPage() {
  return <HillLab />;
}

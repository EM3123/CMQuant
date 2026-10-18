import type { Metadata } from "next";
import { VarLab } from "@/components/labs/VarLab";

export const metadata: Metadata = {
  title: "Why does my risk limit miss disasters? — CMQuant",
  description:
    "Fit a 99% loss limit, freeze it, and judge it on days it never saw. Gaussian VaR and expected shortfall, with a free lab.",
};

export default function RiskLimitPage() {
  return <VarLab />;
}

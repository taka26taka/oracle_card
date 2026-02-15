import dynamic from "next/dynamic";

const DeepPageClient = dynamic(() => import("../../components/deep/DeepPageClient"), {
  ssr: false
});

export default function DeepPage() {
  return <DeepPageClient />;
}

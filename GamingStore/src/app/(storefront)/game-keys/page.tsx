import type { Metadata } from "next";
import { CategoryView } from "@/components/store/category-view";

export const metadata: Metadata = {
  title: "Game keys",
};

export default async function GameKeysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CategoryView
      slug="game-keys"
      title="Game keys"
      description="Official Steam, Epic Games and other platform activation keys — encrypted inventory, delivered straight to your order page."
      basePath="/game-keys"
      searchParams={params}
    />
  );
}

import type { Metadata } from "next";
import { CategoryView } from "@/components/store/category-view";

export const metadata: Metadata = {
  title: "Gift cards",
};

export default async function GiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CategoryView
      slug="gift-cards"
      title="Gift cards"
      description="Steam, PlayStation, Xbox wallet cards — top up your gaming balance instantly."
      basePath="/gift-cards"
      searchParams={params}
    />
  );
}

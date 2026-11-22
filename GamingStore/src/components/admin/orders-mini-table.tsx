import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";

const STATUS_VARIANT: Record<string, "success" | "warning" | "accent" | "danger" | "neutral"> = {
  pending_payment: "warning",
  payment_submitted: "accent",
  payment_verified: "accent",
  processing: "accent",
  completed: "success",
  cancelled: "neutral",
  refunded: "neutral",
  delivery_failed: "danger",
};

export const OrdersMiniTable = ({
  orders,
}: {
  orders: { id: string; order_number: string; status: string; total: string; created: string }[];
}) => {
  if (orders.length === 0) {
    return <EmptyState title="No orders yet" text="Orders appear here as customers check out." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell>
              <Link href={`/admin/orders?orderId=${o.id}`} className="font-mono text-xs hover:text-primary">
                {o.order_number}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"}>{o.status.replace(/_/g, " ")}</Badge>
            </TableCell>
            <TableCell className="text-sm">{o.total}</TableCell>
            <TableCell className="text-right text-xs text-foreground-dim">{o.created}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

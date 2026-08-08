import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { getCartWithPricing } from "@/actions/cart";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Alert, ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your wholesale order with cash on delivery.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const customer = await requireCustomer("/checkout");
  const cart = await getCartWithPricing();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-12">
        <PageHeader title="Checkout" />
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Add products to your cart before checking out."
          action={<ButtonLink href="/products">Shop Products</ButtonLink>}
        />
      </div>
    );
  }

  if (cart.hasStockIssue) {
    return (
      <div className="container-page py-12">
        <PageHeader title="Checkout" />
        <Alert tone="warning" className="mb-5">
          Some items in your cart exceed available stock. Please adjust the quantities before
          placing your order.
        </Alert>
        <ButtonLink href="/cart">Back to Cart</ButtonLink>
      </div>
    );
  }

  const defaultAddress = await prisma.address.findFirst({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  // Redirect guard: if the cart was emptied between render and now.
  if (cart.total <= 0 && cart.items.length === 0) redirect("/cart");

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="Checkout"
        description="Confirm your business details and delivery address to place this order."
      />

      <CheckoutForm
        cart={cart}
        defaults={{
          businessName: customer.businessProfile?.businessName ?? "",
          contactName: customer.name,
          phone: customer.phone,
          email: customer.email,
          gstNumber: customer.businessProfile?.gstNumber ?? "",
          line1: defaultAddress?.line1 ?? "",
          line2: defaultAddress?.line2 ?? "",
          city: defaultAddress?.city ?? "",
          state: defaultAddress?.state ?? "",
          pincode: defaultAddress?.pincode ?? "",
        }}
      />
    </div>
  );
}

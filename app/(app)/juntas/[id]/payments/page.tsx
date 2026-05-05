import { redirect } from 'next/navigation';

export default function PaymentsPage({ params }: { params: { id: string } }) {
  redirect(`/juntas/${params.id}?tab=pagos`);
}

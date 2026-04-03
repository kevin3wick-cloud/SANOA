import Link from "next/link";
import { Ticket, Tenant } from "@prisma/client";
import { formatCategory, formatDate, formatStatus } from "@/lib/format";

type TicketWithTenant = Ticket & {
  tenant: Tenant;
};

type TicketTableProps = {
  tickets: TicketWithTenant[];
};

export function TicketTable({ tickets }: TicketTableProps) {
  if (tickets.length === 0) {
    return <p className="muted">Keine Tickets gefunden.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Mieter</th>
            <th>Wohnung</th>
            <th>Kategorie</th>
            <th>Status</th>
            <th>Erstellt</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>
                <Link className="table-link dashboard-ticket-title-link" href={`/tickets/${ticket.id}`}>
                  {ticket.title}
                </Link>
              </td>
              <td>{ticket.tenant.name}</td>
              <td>{ticket.tenant.apartment}</td>
              <td>{formatCategory(ticket.category)}</td>
              <td>{formatStatus(ticket.status)}</td>
              <td>{formatDate(ticket.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

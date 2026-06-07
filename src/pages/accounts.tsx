import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AccountsService from "../services/accounts.service";

function Accounts(): React.JSX.Element {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AccountsService.getAllAccounts()
      .then((data) => {
        setAccounts(Array.isArray(data) ? data : [data]);
      })
      .catch(() => setError("Failed to load accounts."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 lg:px-6">
      <h1 className="mb-4 text-2xl font-semibold">Accounts</h1>

      {loading && <p className="text-muted-foreground">Loading...</p>}

      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && accounts.length === 0 && (
        <p className="text-muted-foreground">No accounts found.</p>
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                {Object.keys(accounts[0]).map((key) => (
                  <TableHead key={key} className="capitalize">
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account, i) => (
                <TableRow key={i}>
                  {Object.values(account).map((value, j) => (
                    <TableCell key={j}>{String(value)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default Accounts;

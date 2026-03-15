const fs = require('fs'); 
const content = fs.readFileSync('src/pages/farmer/PurchaseRequestsPage.tsx', 'utf-8'); 
const startIndex = content.indexOf('{historyRequests.map');
const endIndex = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', startIndex) + 1) + 1) + 1) + 6;
const replace = `{historyRequests.map((req: any) => (
    <div key={req.id} className="bg-card border border-border p-6 flex flex-col sm:flex-row justify-between gap-4">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                {req.status === "accepted" && <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-xs font-medium">Accepted</span>}
                {req.status === "rejected" && <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-md text-xs font-medium">Rejected</span>}
                {req.status === "completed" && <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xs font-medium">Completed</span>}
            </div>
            <p className="text-sm text-muted-foreground">Type: {req.request_type}</p>
            <div className="flex items-center gap-3 mt-2">
                <p className="text-sm font-medium">Total: ₹{req.quantity_kg * req.offered_price}</p>
                {req.status !== "rejected" && (
                    <span className={\`text-xs px-2 py-0.5 rounded-full border \${req.payment_status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}\`}>
                        {req.payment_status?.toUpperCase() || "UNPAID"}
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {req.status !== "rejected" && (
                <Button size="sm" variant="outline" onClick={() => showBill(req)} className="flex items-center gap-1">
                    <FileText className="h-4 w-4" /> View Bill
                </Button>
            )}
        </div>
    </div>
))}`

fs.writeFileSync('src/pages/farmer/PurchaseRequestsPage.tsx', content.substring(0, startIndex) + replace + content.substring(endIndex));

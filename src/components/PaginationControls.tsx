import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  className?: string;
};

export const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: PaginationControlsProps) => {
  if (totalItems <= pageSize || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageWindow = 2;
  const from = Math.max(1, currentPage - pageWindow);
  const to = Math.min(totalPages, currentPage + pageWindow);

  const pages: number[] = [];
  for (let p = from; p <= to; p += 1) pages.push(p);

  return (
    <div className={className || "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}>
      <p className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>

        {from > 1 && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => onPageChange(1)}>
              1
            </Button>
            {from > 2 && <span className="px-1 text-muted-foreground">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            type="button"
            size="sm"
            variant={page === currentPage ? "default" : "ghost"}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span className="px-1 text-muted-foreground">...</span>}
            <Button type="button" variant="ghost" size="sm" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

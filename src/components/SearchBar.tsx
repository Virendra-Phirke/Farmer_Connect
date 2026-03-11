import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface SearchBarProps {
    placeholder?: string;
    onSearch: (value: string) => void;
    debounceMs?: number;
    initialValue?: string;
}

export function SearchBar({
    placeholder = "Search...",
    onSearch,
    debounceMs = 300,
    initialValue = ""
}: SearchBarProps) {
    const [value, setValue] = useState(initialValue);

    // Effect for debouncing input
    useEffect(() => {
        const handler = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        // Cleanup the timeout if value changes before the delay finishes
        return () => {
            clearTimeout(handler);
        };
    }, [value, debounceMs, onSearch]);

    const handleClear = () => {
        setValue("");
        onSearch(""); // Immediately clear without debounce
    };

    return (
        <div className="relative flex items-center w-full max-w-md">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="pl-9 pr-10 rounded-full bg-card/50 focus-visible:ring-primary/30"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="absolute right-1 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                </Button>
            )}
        </div>
    );
}

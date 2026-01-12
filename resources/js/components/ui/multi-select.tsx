import * as React from "react"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type Option = {
    value: string
    label: string
}

type MultiSelectProps = {
    options: Option[]
    selected: string[]
    onSelectionChange: (selected: string[]) => void
    placeholder?: string
    className?: string
    id?: string
}

export function MultiSelect({
    options,
    selected,
    onSelectionChange,
    placeholder = "Pilih...",
    className,
    id,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter((s) => s !== value)
            : [...selected, value]
        onSelectionChange(newSelected)
    }

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onSelectionChange([])
        } else {
            onSelectionChange(options.map((opt) => opt.value))
        }
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelectionChange([])
    }

    const displayText =
        selected.length === 0
            ? placeholder
            : selected.length === 1
              ? options.find((opt) => opt.value === selected[0])?.label || placeholder
              : `${selected.length} item dipilih`

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    className={cn(
                        "w-full justify-between text-left font-normal",
                        !selected.length && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="truncate">{displayText}</span>
                    <div className="flex items-center gap-1">
                        {selected.length > 0 && (
                            <XIcon
                                className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                                onClick={handleClear}
                            />
                        )}
                        <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                <div className="max-h-[300px] overflow-y-auto">
                    <DropdownMenuCheckboxItem
                        checked={selected.length === options.length && options.length > 0}
                        onCheckedChange={handleSelectAll}
                    >
                        {selected.length === options.length && options.length > 0 ? "Hapus Semua" : "Pilih Semua"}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {options.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={selected.includes(option.value)}
                            onCheckedChange={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


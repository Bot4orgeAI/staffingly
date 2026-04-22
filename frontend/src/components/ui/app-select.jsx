import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "",
  triggerClassName = "",
  contentClassName = "",
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? {
          label: option
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
          value: option,
        }
      : option
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-full rounded-xl border-slate-200", triggerClassName)}>
        <SelectValue placeholder={placeholder}>{selectedOption?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {normalizedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

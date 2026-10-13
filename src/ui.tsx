import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      title={label}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="add-button" onClick={onClick}>
      <Plus size={15} />
      {children}
    </button>
  );
}
export function DeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <IconButton label={label} onClick={onClick}>
      <Trash2 size={15} />
    </IconButton>
  );
}
export type EditDesign = (
  recipe: (draft: import("./model").Design) => void,
  deletion?: boolean,
) => void;

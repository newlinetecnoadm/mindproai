import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface MentionUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  users: MentionUser[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const MentionInput = ({ value, onChange, onSubmit, users, placeholder, className, autoFocus }: MentionInputProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter((u) => {
    const q = mentionQuery.toLowerCase();
    return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }).slice(0, 6);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    onChange(val);

    // Check if we're in a mention context
    const textBeforeCursor = val.slice(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only trigger if @ is at start or after whitespace, and no space in query
      if ((charBefore === " " || charBefore === "\n" || atIndex === 0) && !textAfterAt.includes(" ")) {
        setMentionStart(atIndex);
        setMentionQuery(textAfterAt);
        setShowDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowDropdown(false);
  }, [onChange]);

  const insertMention = useCallback((user: MentionUser) => {
    const name = user.full_name || user.email || "usuário";
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1); // +1 for @
    const newValue = `${before}@${name} ${after}`;
    onChange(newValue);
    setShowDropdown(false);

    // Refocus
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = mentionStart + name.length + 2; // @ + name + space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [value, mentionStart, mentionQuery, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    // Submit on Enter (without shift) when dropdown is closed
    if (e.key === "Enter" && !e.shiftKey && !showDropdown) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Escreva um comentário... Use @ para mencionar"}
        rows={2}
        className={cn("resize-none text-sm w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
      />

      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50"
        >
          {filteredUsers.map((u, i) => (
            <button
              key={u.user_id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.full_name || "Sem nome"}</p>
                {u.email && <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;

/** Extract mentioned user_ids from comment text given a list of users */
export function extractMentionedUserIds(text: string, users: MentionUser[]): string[] {
  const mentioned = new Set<string>();
  for (const u of users) {
    const name = u.full_name || u.email;
    if (name && text.includes(`@${name}`)) {
      mentioned.add(u.user_id);
    }
  }
  return Array.from(mentioned);
}

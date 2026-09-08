import React, { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

export const TagInput = ({ value, onChange, placeholder, splitChars = [";"] }: any) => {
  const [inputValue, setInputValue] = useState("");
  
  const tags = value ? value.split(";").map((t: string) => t.trim()).filter(Boolean) : [];

  const updateTags = (newTags: string[]) => {
    onChange(newTags.join(";"));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || splitChars.includes(e.key)) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag) {
        updateTags([...tags, newTag]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      e.preventDefault();
      const newTags = [...tags];
      newTags.pop();
      updateTags(newTags);
    }
  };

  const removeTag = (indexToRemove: number) => {
    updateTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    if (!paste) return;
    
    const pastedTags = paste.split(new RegExp(`[${splitChars.join("")}]`))
      .map(t => t.trim())
      .filter(Boolean);
      
    if (pastedTags.length > 0) {
      updateTags([...tags, ...pastedTags]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded focus-within:ring-2 focus-within:ring-blue-500 min-h-[38px] items-center">
      {tags.map((tag: string, index: number) => (
        <span key={index} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-sm">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:bg-blue-200 rounded-sm p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-1 min-w-[120px] text-sm bg-transparent outline-none p-0.5"
        placeholder={tags.length === 0 ? placeholder : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) {
            updateTags([...tags, inputValue.trim()]);
            setInputValue("");
          }
        }}
      />
    </div>
  );
};
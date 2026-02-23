import sys
import re
import os
import stat
from typing import List, Optional, Match

def patch_file(filepath: str) -> None:
    """
    Patches a Swift file to remove #Preview blocks and replace @Entry with manual EnvironmentKey.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content: str = f.read()
    except Exception as e:
        print(f"!!! Error reading {filepath}: {e}")
        return

    orig_content: str = content
    
    # 1. Remove #Preview blocks with preceding attributes
    def remove_previews(text: str) -> str:
        current_text: str = text
        # Regex to find #Preview preceded by any number of @available attributes
        # We use re.DOTALL and [^)]* to handle multiline attributes
        pattern: str = r'(?:@available\s*\([^)]*\)\s*)*#Preview'
        
        while True:
            match: Optional[Match[str]] = re.search(pattern, current_text, re.DOTALL)
            if not match:
                break
            
            start_pos: int = match.start()
            end_match: int = match.end()
            
            # Find the opening brace after the #Preview
            brace_start: int = current_text.find('{', end_match)
            if brace_start == -1:
                # Remove just the match if no block follows
                current_text = current_text[:start_pos] + current_text[end_match:]
                continue
                
            # Brace matching
            stack: int = 1
            idx: int = brace_start + 1
            length: int = len(current_text)
            while idx < length and stack > 0:
                char: str = current_text[idx]
                if char == '{':
                    stack += 1
                elif char == '}':
                    stack -= 1
                idx += 1
            
            if stack == 0:
                # Full block found
                current_text = current_text[:start_pos] + current_text[idx:]
            else:
                # Malformed, just remove the match
                current_text = current_text[:start_pos] + current_text[end_match:]
                
        return current_text

    content = remove_previews(content)
    
    # 2. Replace @Entry with manual EnvironmentKey
    # Process lines
    lines: List[str] = content.split('\n')
    new_lines: List[str] = []
    line_idx: int = 0
    total_lines: int = len(lines)
    changed: bool = False
    
    while line_idx < total_lines:
        line: str = lines[line_idx]
        if '@Entry' in line and re.search(r'^\s*@Entry', line):
            # Potential match
            prefix_match: Optional[Match[str]] = re.match(r'^(\s*)', line)
            indent: str = prefix_match.group(1) if prefix_match else ""
            
            # Heuristic: Find the 'var' declaration in the next few lines
            var_found_idx: int = -1
            collected_attrs: List[str] = []
            
            # Look back for already added attributes in new_lines
            while new_lines:
                last_line: str = new_lines[-1]
                if re.match(r'^\s*(?:@|import|///|//)', last_line):
                    collected_attrs.insert(0, new_lines.pop())
                else:
                    break
            
            # Look ahead for var
            scan_idx: int = line_idx
            while scan_idx < total_lines and scan_idx < line_idx + 10:
                curr: str = lines[scan_idx]
                if 'var ' in curr:
                    var_found_idx = scan_idx
                    break
                # Only collect as attribute if it's not the @Entry line itself
                if '@Entry' not in curr and curr.strip():
                    collected_attrs.append(curr)
                scan_idx += 1
            
            if var_found_idx != -1:
                var_line: str = lines[var_found_idx]
                # Regex for: var name [: Type] = default
                v_match: Optional[Match[str]] = re.search(r'var\s+(\w+)(?:\s*:\s*(.*?))?\s*=\s*(.*)', var_line)
                if v_match:
                    v_name: str = v_match.group(1)
                    v_type: Optional[str] = v_match.group(2)
                    # Use strip() to clean up the type string
                    if v_type:
                        v_type = v_type.strip()
                    v_default: str = v_match.group(3).strip()
                    # Remove trailing comment if exists
                    v_default = v_default.split('//')[0].strip()
                    
                    if not v_type:
                        # Improved type inference for nested types and enums
                        # Strip anything starting from '(' to end of string for type detection
                        type_source = v_default.split('(')[0].strip()
                        
                        if type_source.startswith('.'):
                            v_type = "Any"
                        elif '.' in type_source:
                            parts: List[str] = type_source.split('.')
                            type_parts: List[str] = []
                            for p in parts:
                                # If part starts with Uppercase, it's likely a Type
                                if p and p[0].isupper():
                                    type_parts.append(p)
                                else:
                                    # Reached a member or case
                                    break
                            
                            if type_parts:
                                v_type = ".".join(type_parts)
                            else:
                                v_type = "Any"
                        else:
                            # Single word: check if starts with Uppercase
                            if type_source and type_source[0].isupper():
                                v_type = type_source
                            else:
                                v_type = "Any"
                    
                    k_name: str = f"{v_name}Key"
                    
                    # Generate replacement
                    new_lines.append(f"{indent}struct {k_name}: EnvironmentKey {{")
                    new_lines.append(f"{indent}    static nonisolated(unsafe) let defaultValue: {v_type} = {v_default}")
                    new_lines.append(f"{indent}}}")
                    for attr_line in collected_attrs:
                        new_lines.append(attr_line)
                    new_lines.append(f"{indent}var {v_name}: {v_type} {{")
                    new_lines.append(f"{indent}    get {{ self[{k_name}.self] }}")
                    new_lines.append(f"{indent}    set {{ self[{k_name}.self] = newValue }}")
                    new_lines.append(f"{indent}}}")
                    
                    line_idx = var_found_idx + 1
                    changed = True
                    continue
                    
        new_lines.append(line)
        line_idx += 1
        
    if changed or content != orig_content:
        try:
            # Re-ensure write permissions
            if os.path.exists(filepath) and not os.access(filepath, os.W_OK):
                os.chmod(filepath, os.stat(filepath).st_mode | stat.S_IWRITE)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
            print(f"Patched {filepath}")
        except Exception as e:
            print(f"!!! Error writing {filepath}: {e}")

def main() -> None:
    if len(sys.argv) < 2:
        return
    for arg in sys.argv[1:]:
        if os.path.isfile(arg):
            patch_file(arg)
        elif os.path.isdir(arg):
            for root, _, files in os.walk(arg):
                for f_name in files:
                    if f_name.endswith('.swift'):
                        full_p: str = os.path.join(root, f_name)
                        patch_file(full_p)

if __name__ == "__main__":
    main()

import os

path = '/Users/lex/Downloads/Arquivos/ZERO/docs/gateway/security.md'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '## Lições Aprendidas (Do Jeito Difícil)' in line or '## Li??es Aprendidas' in line or 'Li\xc3\xa7\xc3\xb5es Aprendidas' in line:
        skip = True
    if skip and '## Endurecimento da Configuração' in line:
        skip = False
    
    if '## A Hierarquia de Confiança' in line or '## A Hierarquia de ConfiaxC3xA7a' in line:
        new_lines.append('## A Hierarquia de Confiança\n\n')
        new_lines.append('```\n')
        new_lines.append('Proprietário (Administrador)\n')
        new_lines.append('  │ Confiança total\n')
        new_lines.append('  ▼\n')
        new_lines.append('IA (Agente)\n')
        new_lines.append('  │ Confiar mas verificar\n')
        new_lines.append('  ▼\n')
        new_lines.append('Usuários na lista de permissão\n')
        new_lines.append('  │ Confiança limitada\n')
        new_lines.append('  ▼\n')
        new_lines.append('Outros usuários\n')
        new_lines.append('  │ Nenhuma confiança\n')
        new_lines.append('```\n')
        skip = True # skip until next heading or end of block
    
    if skip and line.startswith('## '):
        skip = False
        if 'Hierarquia' in line: # if it was the hierarchy we just added, skip the old one
             skip = True
        else:
             new_lines.append(line)
             continue

    if not skip:
        # Fix the specific quoted text too
        if 'Confie acesso ao shell a lagostas' in line:
             new_lines.append('*"Segurança é um processo, não um produto. Mantenha o acesso ao shell sempre protegido."* — Alguém sábio, provavelmente\n')
        else:
             new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

with open('/home/jambo/New_Traffic_Project/ai_service/lightweight_analyzer.py', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip().startswith('avg_texture_density_quick =') or line.strip().startswith('avg_texture ='):
        lines[i] = '            ' + line.strip() + '\n'
        
with open('/home/jambo/New_Traffic_Project/ai_service/lightweight_analyzer.py', 'w') as f:
    f.writelines(lines)

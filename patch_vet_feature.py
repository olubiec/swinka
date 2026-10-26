import re

with open('src/Cuy/dotNet/Features/VetFeature.cs', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix sleep check logic to include IsPhysicsActive which represents being dragged or falling
search_sleep = r'if \(!brain\.IsCurrentlySleeping\(\) && !HomeWindow\.IsOpen\)'
replace_sleep = 'if (!brain.IsCurrentlySleeping() && !brain.IsPhysicsActive && !HomeWindow.IsOpen)'

content = re.sub(search_sleep, replace_sleep, content)

with open('src/Cuy/dotNet/Features/VetFeature.cs', 'w', encoding='utf-8') as f:
    f.write(content)

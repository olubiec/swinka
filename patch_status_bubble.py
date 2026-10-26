import re

with open('src/Cuy/dotNet/StatusBubble.cs', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update DrawHeader
header_search = r'''        private void DrawHeader\(Graphics g\)
        \{
            var pet = BrainController\.Instance\?\.Pet;
            string petName = pet\?\.State\?\.Name \?\? "Cuy";

            // Pig head icon in the corner
            Bitmap iconHead = PetIcons\.GetIconBitmap\("pig_head"\);
            if \(iconHead != null\)
            \{
                g\.DrawImage\(iconHead, new Rectangle\(8, 6, 16, 16\), new Rectangle\(0, 0, 16, 16\), GraphicsUnit\.Pixel\);
            \}

            // The pig's name
            using \(SolidBrush textBrush = new SolidBrush\(ColContourDark\)\)
            \{
                g\.DrawString\(petName, _fontName, textBrush, new PointF\(27, 7\)\);
            \}
        \}'''

header_replace = '''        private void DrawHeader(Graphics g)
        {
            var pet = BrainController.Instance?.Pet;
            string petName = pet?.State?.Name ?? "Cuy";

            // Pig head icon in the corner
            Bitmap iconHead = PetIcons.GetIconBitmap("pig_head");
            if (iconHead != null)
            {
                g.DrawImage(iconHead, new Rectangle(8, 6, 16, 16), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
            }

            // The pig's name
            using (SolidBrush textBrush = new SolidBrush(ColContourDark))
            {
                g.DrawString(petName, _fontName, textBrush, new PointF(27, 7));

                // Draw Health Percentage
                var needs = BrainController.Instance?.Needs;
                if (pet != null && needs != null)
                {
                    double rawHealth = needs.Health;
                    double healthDisplay = Math.Max(5.0, rawHealth - pet.HealthPenalty);
                    string healthStr = $"{healthDisplay:0}%";

                    // Measure text to align it to the right
                    SizeF textSize = g.MeasureString(healthStr, _fontName);
                    float healthX = 160 - textSize.Width; // Right align at width - padding
                    g.DrawString(healthStr, _fontName, textBrush, new PointF(healthX, 7));

                    if (pet.IsSick)
                    {
                        Bitmap vetIcon = PetIcons.GetIconBitmap("vet");
                        if (vetIcon != null)
                        {
                            g.DrawImage(vetIcon, new Rectangle((int)healthX - 18, 6, 16, 16), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
                        }
                    }
                }
            }
        }'''

if header_search not in content:
    content = re.sub(header_search, header_replace, content, flags=re.MULTILINE)
else:
    content = content.replace(header_search.replace('\\', ''), header_replace)


# 2. Update OnMouseMove
mouse_search = r'''                // Tooltips over the needs
                if \(new Rectangle\(8, 25, 70, 16\)\.Contains\(e\.Location\)\) SetToolTipNeed\("Fullness", BrainController\.Instance\?\.Needs\?\.Satiety\);'''

mouse_replace = '''                // Tooltips over the needs
                var pet = BrainController.Instance?.Pet;
                if (pet != null && pet.IsSick && new Rectangle(110, 6, 50, 16).Contains(e.Location)) SetToolTip("Sick \u2013 visit the vet in Home");
                else if (new Rectangle(8, 25, 70, 16).Contains(e.Location)) SetToolTipNeed("Fullness", BrainController.Instance?.Needs?.Satiety);'''

content = re.sub(mouse_search, mouse_replace, content, flags=re.MULTILINE)

with open('src/Cuy/dotNet/StatusBubble.cs', 'w', encoding='utf-8') as f:
    f.write(content)

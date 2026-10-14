using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Cuy.Core;

namespace Cuy
{
    /// <summary>
    /// Dymek stanu świnki w stylu retro pixel art:
    /// - Bez paska tytułu i ramki Windows, przezroczyste tło, ramka i kolory jak w web/home/style.css
    /// - Czcionka Pixelify Sans z web/home/fonts, skalowanie nearest neighbor
    /// - "Ogonek" dymka wskazujący świnkę
    /// - Imię świnki, 6 ikon potrzeb z paskami 0-100 (zielony >60, żółty 30-60, czerwony <30)
    /// - 3 małe przyciski-ikony: Nakarm (siano), Pogłaszcz (purr_pet, +3 humoru), Domek (aktywny po C1)
    /// - Rozmiar ok. 168x122 px (pasujący do 160x110 px przy skali x2)
    /// - Podąża za świnką, znika po 4 s bez kursora albo po kliknięciu obok
    /// - Nie zasłania świnki, nie kradnie fokusu, nie pojawia się w Alt+Tab ani na pasku zadań
    /// </summary>
    public sealed class StatusBubble : Form
    {
        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        private const int VK_LBUTTON = 0x01;
        private const int VK_RBUTTON = 0x02;

        private const int WS_EX_NOACTIVATE = 0x08000000;
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const int WS_EX_TOPMOST = 0x00000008;

        // Paleta z web/home/style.css
        private static readonly Color ColTransparentKey = Color.FromArgb(255, 0, 255); // Magenta
        private static readonly Color ColBubbleBg = Color.FromArgb(248, 237, 221);     // --c-cream (#f8eddd)
        private static readonly Color ColContourDark = Color.FromArgb(43, 23, 18);     // --c-contour-dark (#2b1712)
        private static readonly Color ColGrooveBg = Color.FromArgb(26, 13, 10);        // rowek paska
        private static readonly Color ColLeaf = Color.FromArgb(127, 191, 74);          // --c-leaf (#7fbf4a, zielony)
        private static readonly Color ColGold = Color.FromArgb(242, 201, 76);          // --c-gold (#f2c94c, żółty)
        private static readonly Color ColRed = Color.FromArgb(232, 86, 76);            // --c-red (#e8564c, czerwony)
        private static readonly Color ColBtnFeed = Color.FromArgb(248, 194, 120);      // btn-feed (#f8c278)
        private static readonly Color ColBtnPet = Color.FromArgb(247, 178, 197);       // btn-minigames (#f7b2c5)
        private static readonly Color ColBtnCall = Color.FromArgb(178, 224, 247);      // btn-call (#b2e0f7)
        private static readonly Color ColBtnDomek = Color.FromArgb(220, 204, 238);     // btn-domek (#dc ccee)
        private static readonly Color ColBtnDisabled = Color.FromArgb(222, 215, 203);   // zablokowany (#ded7cb)
        private static readonly Color ColBtnHover = Color.FromArgb(247, 180, 110);     // hover (#f7b46e)
        private static readonly Color ColBtnActive = Color.FromArgb(200, 105, 47);      // active (#c8692f)
        private static readonly Color ColWhite = Color.FromArgb(255, 253, 248);        // --c-white (#fffdf8)

        private readonly FormPet _petForm;
        private readonly Timer _updateTimer;
        private readonly ToolTip _toolTip;

        // Czas bez kursora (do auto-ukrywania po 4 s)
        private TimeSpan _timeWithoutCursor = TimeSpan.Zero;
        private bool _wasMouseDownOutside = false;

        // Czcionki Pixelify Sans
        private static PrivateFontCollection _fontCollection;
        private static FontFamily _pixelFamily;
        private Font _fontName;
        private Font _fontPercent;

        // Układ przycisków: 4 przyciski po 35 px (szerokość dymka 168 px, 8 px marginesy)
        private readonly Rectangle _rcBtnFeed = new Rectangle(8, 86, 35, 24);
        private readonly Rectangle _rcBtnPet = new Rectangle(47, 86, 35, 24);
        private readonly Rectangle _rcBtnCall = new Rectangle(86, 86, 35, 24);
        private readonly Rectangle _rcBtnDomek = new Rectangle(125, 86, 35, 24);

        private int _hoveredButton = -1; // 0=Feed, 1=Pet, 2=Call, 3=Domek, -1=None
        private int _pressedButton = -1;
        private string _lastHoveredTip = null;

        public StatusBubble(FormPet petForm)
        {
            _petForm = petForm ?? throw new ArgumentNullException(nameof(petForm));

            // Konfiguracja okna bez ramki i przezroczystości
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            TopMost = true;
            DoubleBuffered = true;
            BackColor = ColTransparentKey;
            TransparencyKey = ColTransparentKey;
            Size = new Size(168, 122); // Box: 168x114 px + 8 px ogonek

            InitFonts();

            _toolTip = new ToolTip
            {
                InitialDelay = 200,
                ReshowDelay = 100,
                AutoPopDelay = 3000,
                ShowAlways = true
            };

            _updateTimer = new Timer
            {
                Interval = 30 // ~33 FPS śledzenia i odświeżania
            };
            _updateTimer.Tick += OnUpdateTimerTick;

            UpdatePosition();
        }

        protected override bool ShowWithoutActivation => true;

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= WS_EX_NOACTIVATE;
                cp.ExStyle |= WS_EX_TOOLWINDOW;
                cp.ExStyle |= WS_EX_TOPMOST;
                return cp;
            }
        }

        private void InitFonts()
        {
            if (_pixelFamily == null)
            {
                try
                {
                    _fontCollection = new PrivateFontCollection();
                    string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                    string[] searchPaths = new string[]
                    {
                        Path.Combine(baseDir, "web", "home", "fonts", "PixelifySans-Bold.ttf"),
                        Path.Combine(Directory.GetCurrentDirectory(), "web", "home", "fonts", "PixelifySans-Bold.ttf")
                    };

                    foreach (var p in searchPaths)
                    {
                        if (File.Exists(p))
                        {
                            _fontCollection.AddFontFile(Path.GetFullPath(p));
                            _pixelFamily = _fontCollection.Families[0];
                            break;
                        }
                    }
                }
                catch { }

                if (_pixelFamily == null)
                {
                    _pixelFamily = FontFamily.GenericMonospace;
                }
            }

            try
            {
                _fontName = new Font(_pixelFamily, 11f, FontStyle.Bold, GraphicsUnit.Pixel);
                _fontPercent = new Font(_pixelFamily, 9f, FontStyle.Bold, GraphicsUnit.Pixel);
            }
            catch
            {
                _fontName = new Font(FontFamily.GenericSansSerif, 10f, FontStyle.Bold, GraphicsUnit.Pixel);
                _fontPercent = new Font(FontFamily.GenericMonospace, 8f, FontStyle.Bold, GraphicsUnit.Pixel);
            }
        }

        public void ShowBubble()
        {
            _timeWithoutCursor = TimeSpan.Zero;
            _wasMouseDownOutside = false;
            UpdatePosition();
            if (!Visible)
            {
                Show();
            }
            BringToFront();
            _updateTimer.Start();
            Invalidate();
        }

        public void HideBubble()
        {
            _updateTimer.Stop();
            _toolTip.Hide(this);
            Hide();
        }

        public void ToggleBubble()
        {
            if (Visible)
            {
                HideBubble();
            }
            else
            {
                ShowBubble();
            }
        }

        private void OnUpdateTimerTick(object sender, EventArgs e)
        {
            if (!Visible)
            {
                _updateTimer.Stop();
                return;
            }

            if (_petForm == null || _petForm.IsDisposed)
            {
                HideBubble();
                return;
            }

            // 1. Podążanie za świnką
            UpdatePosition();

            // 2. Wykrywanie kursora nad dymkiem lub świnką
            Point mousePos = Cursor.Position;
            bool overBubble = this.Bounds.Contains(mousePos);
            bool overPet = _petForm.Bounds.Contains(mousePos);

            if (overBubble || overPet)
            {
                _timeWithoutCursor = TimeSpan.Zero;
            }
            else
            {
                _timeWithoutCursor += TimeSpan.FromMilliseconds(_updateTimer.Interval);
                if (_timeWithoutCursor >= TimeSpan.FromSeconds(4.0))
                {
                    HideBubble();
                    return;
                }
            }

            // 3. Wykrywanie kliknięcia obok (poza dymkiem i świnką)
            bool isLDown = (GetAsyncKeyState(VK_LBUTTON) & 0x8000) != 0;
            bool isRDown = (GetAsyncKeyState(VK_RBUTTON) & 0x8000) != 0;

            if (isLDown || isRDown)
            {
                if (!overBubble && !overPet)
                {
                    if (!_wasMouseDownOutside)
                    {
                        HideBubble();
                        return;
                    }
                }
                _wasMouseDownOutside = true;
            }
            else
            {
                _wasMouseDownOutside = false;
            }

            Invalidate();
        }

        private void UpdatePosition()
        {
            if (_petForm == null || _petForm.IsDisposed) return;

            Rectangle workingArea = Screen.FromControl(_petForm).WorkingArea;

            int pigCenterX = _petForm.Left + (_petForm.Width / 2);
            int targetX = pigCenterX - (this.Width / 2);

            // Położenie Y nad świnką (ogonek dotyka góry świnki)
            int targetY = _petForm.Top - this.Height + 4;

            // Zabezpieczenie przed wyjściem poza ekran
            if (targetY < workingArea.Top)
            {
                // Jeśli świnka jest pod samą górną krawędzią ekranu, umieść dymek pod nią
                targetY = _petForm.Bottom - 2;
            }

            targetX = Math.Max(workingArea.Left + 2, Math.Min(workingArea.Right - this.Width - 2, targetX));

            Point newLocation = new Point(targetX, targetY);
            if (this.Location != newLocation)
            {
                this.Location = newLocation;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;
            g.SmoothingMode = SmoothingMode.None;
            g.TextRenderingHint = TextRenderingHint.SingleBitPerPixelGridFit;

            // Rysowanie tła dymka i ogonka
            DrawBubbleShape(g);

            // Rysowanie nagłówka z imieniem świnki
            DrawHeader(g);

            // Rysowanie 6 pasków potrzeb
            DrawNeeds(g);

            // Linia rozdzielająca
            using (Pen p = new Pen(Color.FromArgb(228, 207, 181))) // --c-cream-dark
            {
                g.DrawLine(p, 8, 80, 160, 80);
            }

            // Rysowanie 3 przycisków
            DrawButtons(g);
        }

        private void DrawBubbleShape(Graphics g)
        {
            int w = 168;
            int boxH = 114;

            // Obliczenie pozycji ogonka wskazującego świnkę
            int pigCenterX = _petForm != null && !_petForm.IsDisposed ? _petForm.Left + (_petForm.Width / 2) : this.Left + (w / 2);
            int localPigCenter = pigCenterX - this.Left;
            int tailX = Math.Max(20, Math.Min(w - 36, localPigCenter - 8));

            // Wypełnienie prostokąta dymka (retro pixel box z obciętymi narożnikami 2px)
            using (SolidBrush bgBrush = new SolidBrush(ColBubbleBg))
            {
                // Ciało główne dymka
                g.FillRectangle(bgBrush, 2, 2, w - 4, boxH - 4);
                g.FillRectangle(bgBrush, 1, 4, 1, boxH - 8);
                g.FillRectangle(bgBrush, w - 2, 4, 1, boxH - 8);
                g.FillRectangle(bgBrush, 4, 1, w - 8, 1);
                g.FillRectangle(bgBrush, 4, boxH - 2, w - 8, 1);

                // Wypełnienie trójkąta ogonka (skierowanego w dół)
                Point[] tailPoints = new Point[]
                {
                    new Point(tailX, boxH - 2),
                    new Point(tailX + 16, boxH - 2),
                    new Point(tailX + 8, boxH + 7)
                };
                g.FillPolygon(bgBrush, tailPoints);
            }

            // Obrys pixel-art kontur (#2b1712, 2px grubości)
            using (Pen borderPen = new Pen(ColContourDark, 1f))
            {
                // Górna krawędź
                g.DrawLine(borderPen, 3, 0, w - 4, 0);
                g.DrawLine(borderPen, 2, 1, w - 3, 1);

                // Lewa krawędź
                g.DrawLine(borderPen, 0, 3, 0, boxH - 4);
                g.DrawLine(borderPen, 1, 2, 1, boxH - 3);

                // Prawa krawędź
                g.DrawLine(borderPen, w - 1, 3, w - 1, boxH - 4);
                g.DrawLine(borderPen, w - 2, 2, w - 2, boxH - 3);

                // Dolna krawędź z przerwą na ogonek
                g.DrawLine(borderPen, 3, boxH - 1, tailX, boxH - 1);
                g.DrawLine(borderPen, 2, boxH - 2, tailX, boxH - 2);

                g.DrawLine(borderPen, tailX + 16, boxH - 1, w - 4, boxH - 1);
                g.DrawLine(borderPen, tailX + 16, boxH - 2, w - 3, boxH - 2);

                // Ścięte narożniki 2x2
                g.DrawLine(borderPen, 1, 2, 2, 1);
                g.DrawLine(borderPen, w - 2, 1, w - 3, 2);
                g.DrawLine(borderPen, 1, boxH - 3, 2, boxH - 2);
                g.DrawLine(borderPen, w - 2, boxH - 3, w - 3, boxH - 2);

                // Krawędzie ogonka
                g.DrawLine(borderPen, tailX, boxH - 1, tailX + 8, boxH + 7);
                g.DrawLine(borderPen, tailX + 1, boxH - 1, tailX + 8, boxH + 6);

                g.DrawLine(borderPen, tailX + 16, boxH - 1, tailX + 8, boxH + 7);
                g.DrawLine(borderPen, tailX + 15, boxH - 1, tailX + 8, boxH + 6);
            }
        }

        private void DrawHeader(Graphics g)
        {
            var pet = BrainController.Instance?.Pet;
            string petName = pet?.State?.Name ?? "Świnka";

            // Ikonka główki świnki w rogu
            Bitmap iconHead = PetIcons.GetIconBitmap("pig_head");
            if (iconHead != null)
            {
                g.DrawImage(iconHead, new Rectangle(8, 6, 16, 16), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
            }

            // Tekst imienia świnki
            using (SolidBrush textBrush = new SolidBrush(ColContourDark))
            {
                g.DrawString(petName, _fontName, textBrush, new PointF(27, 7));
            }
        }

        private void DrawNeeds(Graphics g)
        {
            var needs = BrainController.Instance?.Needs;
            double satiety = needs != null ? needs.Satiety : 85.0;
            double vitC = needs != null ? needs.VitaminC : 80.0;
            double energy = needs != null ? needs.Energy : 90.0;
            double mood = needs != null ? needs.Mood : 75.0;
            double clean = needs != null ? needs.Cleanliness : 65.0;
            double teeth = needs != null ? needs.Teeth : 88.0;

            // 6 potrzeb w siatce 2 kolumny x 3 wiersze
            // Rząd 1: Najedzenie (L) | Witamina C (P)
            DrawNeedItem(g, 8, 25, "need_fullness", satiety);
            DrawNeedItem(g, 88, 25, "need_vitamin_c", vitC);

            // Rząd 2: Energia (L) | Humor (P)
            DrawNeedItem(g, 8, 43, "need_energy", energy);
            DrawNeedItem(g, 88, 43, "need_mood", mood);

            // Rząd 3: Czystość (L) | Ząbki (P)
            DrawNeedItem(g, 8, 61, "need_cleanliness", clean);
            DrawNeedItem(g, 88, 61, "need_teeth", teeth);
        }

        private void DrawNeedItem(Graphics g, int x, int y, string iconName, double value)
        {
            // 1. Ikona potrzeby (16x16 px)
            Bitmap iconBmp = PetIcons.GetIconBitmap(iconName);
            if (iconBmp != null)
            {
                g.DrawImage(iconBmp, new Rectangle(x, y, 16, 16), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
            }

            // 2. Pasek postępu (szerokość 48 px, wysokość 8 px)
            int barX = x + 18;
            int barY = y + 4;
            int barW = 50;
            int barH = 8;

            // Rowek paska (tło ciemny brąz)
            using (SolidBrush grooveBrush = new SolidBrush(ColGrooveBg))
            {
                g.FillRectangle(grooveBrush, barX, barY, barW, barH);
            }
            using (Pen groovePen = new Pen(ColContourDark, 1f))
            {
                g.DrawRectangle(groovePen, barX, barY, barW - 1, barH - 1);
            }

            // Kolor wypełnienia: zielony >60, żółty 30-60, czerwony <30
            Color fillColor;
            Color highlightColor;
            if (value > 60.0)
            {
                fillColor = ColLeaf;
                highlightColor = Color.FromArgb(165, 224, 117);
            }
            else if (value >= 30.0)
            {
                fillColor = ColGold;
                highlightColor = Color.FromArgb(253, 224, 136);
            }
            else
            {
                fillColor = ColRed;
                highlightColor = Color.FromArgb(245, 133, 126);
            }

            int innerW = barW - 2;
            int fillW = (int)Math.Round((Math.Max(0.0, Math.Min(100.0, value)) / 100.0) * innerW);

            if (fillW > 0)
            {
                using (SolidBrush fillBrush = new SolidBrush(fillColor))
                {
                    g.FillRectangle(fillBrush, barX + 1, barY + 1, fillW, barH - 2);
                }
                // Górne podświetlenie pikselowe (1px jasnego akcentu)
                using (Pen highPen = new Pen(highlightColor, 1f))
                {
                    g.DrawLine(highPen, barX + 1, barY + 1, barX + fillW, barY + 1);
                }
            }
        }

        private void DrawButtons(Graphics g)
        {
            // Przycisk 1: Nakarm (ikona: siano)
            DrawPixelButton(g, _rcBtnFeed, "hay", 0, isEnabled: true, baseColor: ColBtnFeed);

            // Przycisk 2: Pogłaszcz (ikona: need_mood / serduszko)
            DrawPixelButton(g, _rcBtnPet, "need_mood", 1, isEnabled: true, baseColor: ColBtnPet);

            // Przycisk 3: Zawołaj (ikona: pig_head)
            DrawPixelButton(g, _rcBtnCall, "pig_head", 2, isEnabled: true, baseColor: ColBtnCall);

            // Przycisk 4: Domek (ikona: domek)
            DrawPixelButton(g, _rcBtnDomek, "house", 3, isEnabled: true, baseColor: ColBtnDomek);
        }

        private void DrawPixelButton(Graphics g, Rectangle r, string iconName, int btnIndex, bool isEnabled, Color baseColor)
        {
            bool isHovered = isEnabled && (_hoveredButton == btnIndex);
            bool isPressed = isEnabled && (_pressedButton == btnIndex);

            Color bg = baseColor;
            if (!isEnabled)
            {
                bg = ColBtnDisabled;
            }
            else if (isPressed)
            {
                bg = ColBtnActive;
            }
            else if (isHovered)
            {
                bg = ColBtnHover;
            }

            // Tło przycisku
            using (SolidBrush b = new SolidBrush(bg))
            {
                g.FillRectangle(b, r.X + 1, r.Y + 1, r.Width - 2, r.Height - 2);
            }

            // Ramka ciemna
            using (Pen p = new Pen(isEnabled ? ColContourDark : Color.FromArgb(112, 101, 93), 1f))
            {
                g.DrawRectangle(p, r.X, r.Y, r.Width - 1, r.Height - 1);
            }

            // Pikselowy efekt ścięcia/wypukłości
            if (isEnabled && !isPressed)
            {
                using (Pen highPen = new Pen(ColWhite, 1f))
                {
                    g.DrawLine(highPen, r.X + 1, r.Y + 1, r.Right - 2, r.Y + 1);
                    g.DrawLine(highPen, r.X + 1, r.Y + 1, r.X + 1, r.Bottom - 2);
                }
                using (Pen shadowPen = new Pen(ColContourDark, 1f))
                {
                    g.DrawLine(shadowPen, r.X + 1, r.Bottom - 1, r.Right - 1, r.Bottom - 1);
                    g.DrawLine(shadowPen, r.Right - 1, r.Y + 1, r.Right - 1, r.Bottom - 1);
                }
            }

            // Ikona 16x16 px wyśrodkowana w przycisku
            Bitmap iconBmp = PetIcons.GetIconBitmap(iconName);
            if (iconBmp != null)
            {
                int iconX = r.X + (r.Width - 16) / 2;
                int iconY = r.Y + (r.Height - 16) / 2 + (isPressed ? 1 : 0);

                if (!isEnabled)
                {
                    // Wyciszona przezroczystość dla zablokowanego domku
                    using (ImageAttributes ia = new ImageAttributes())
                    {
                        ColorMatrix cm = new ColorMatrix
                        {
                            Matrix33 = 0.45f // 45% alpha
                        };
                        ia.SetColorMatrix(cm, ColorMatrixFlag.Default, ColorAdjustType.Bitmap);
                        g.DrawImage(iconBmp, new Rectangle(iconX, iconY, 16, 16), 0, 0, 16, 16, GraphicsUnit.Pixel, ia);
                    }
                }
                else
                {
                    g.DrawImage(iconBmp, new Rectangle(iconX, iconY, 16, 16), new Rectangle(0, 0, 16, 16), GraphicsUnit.Pixel);
                }
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            _timeWithoutCursor = TimeSpan.Zero; // Reset licznika czasu

            int prevHover = _hoveredButton;
            if (_rcBtnFeed.Contains(e.Location))
            {
                _hoveredButton = 0;
                Cursor = Cursors.Hand;
                SetToolTip("Nakarm (siano)");
            }
            else if (_rcBtnPet.Contains(e.Location))
            {
                _hoveredButton = 1;
                Cursor = Cursors.Hand;
                SetToolTip("Pogłaszcz (+5 humoru, +1 więź)");
            }
            else if (_rcBtnCall.Contains(e.Location))
            {
                _hoveredButton = 2;
                Cursor = Cursors.Hand;
                SetToolTip("Zawołaj (przybiega pod kursor)");
            }
            else if (_rcBtnDomek.Contains(e.Location))
            {
                _hoveredButton = 3;
                Cursor = Cursors.Hand;
                SetToolTip("Domek świnki");
            }
            else
            {
                _hoveredButton = -1;
                Cursor = Cursors.Default;

                // Podpowiedzi nad potrzebami
                if (new Rectangle(8, 25, 70, 16).Contains(e.Location)) SetToolTipNeed("Najedzenie", BrainController.Instance?.Needs?.Satiety);
                else if (new Rectangle(88, 25, 70, 16).Contains(e.Location)) SetToolTipNeed("Witamina C", BrainController.Instance?.Needs?.VitaminC);
                else if (new Rectangle(8, 43, 70, 16).Contains(e.Location)) SetToolTipNeed("Energia", BrainController.Instance?.Needs?.Energy);
                else if (new Rectangle(88, 43, 70, 16).Contains(e.Location)) SetToolTipNeed("Humor", BrainController.Instance?.Needs?.Mood);
                else if (new Rectangle(8, 61, 70, 16).Contains(e.Location)) SetToolTipNeed("Czystość", BrainController.Instance?.Needs?.Cleanliness);
                else if (new Rectangle(88, 61, 70, 16).Contains(e.Location)) SetToolTipNeed("Ząbki", BrainController.Instance?.Needs?.Teeth);
                else SetToolTip(null);
            }

            if (prevHover != _hoveredButton)
            {
                Invalidate();
            }
        }

        private void SetToolTipNeed(string name, double? value)
        {
            double val = value.GetValueOrDefault(100.0);
            SetToolTip(string.Format("{0}: {1:0.#}%", name, val));
        }

        private void SetToolTip(string text)
        {
            if (string.Equals(_lastHoveredTip, text, StringComparison.Ordinal)) return;
            _lastHoveredTip = text;
            if (string.IsNullOrEmpty(text))
            {
                _toolTip.Hide(this);
            }
            else
            {
                _toolTip.SetToolTip(this, text);
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            _timeWithoutCursor = TimeSpan.Zero;

            if (e.Button == MouseButtons.Left)
            {
                if (_rcBtnFeed.Contains(e.Location)) _pressedButton = 0;
                else if (_rcBtnPet.Contains(e.Location)) _pressedButton = 1;
                else if (_rcBtnCall.Contains(e.Location)) _pressedButton = 2;
                else if (_rcBtnDomek.Contains(e.Location)) _pressedButton = 3;
                else _pressedButton = -1;

                Invalidate();
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            _timeWithoutCursor = TimeSpan.Zero;

            if (e.Button == MouseButtons.Left && _pressedButton >= 0)
            {
                int clicked = _pressedButton;
                _pressedButton = -1;
                Invalidate();

                if (clicked == 0 && _rcBtnFeed.Contains(e.Location))
                {
                    OnBtnFeedClick();
                }
                else if (clicked == 1 && _rcBtnPet.Contains(e.Location))
                {
                    OnBtnPetClick();
                }
                else if (clicked == 2 && _rcBtnCall.Contains(e.Location))
                {
                    OnBtnCallClick();
                }
                else if (clicked == 3 && _rcBtnDomek.Contains(e.Location))
                {
                    OnBtnDomekClick();
                }
            }
            else
            {
                _pressedButton = -1;
                Invalidate();
            }
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _hoveredButton = -1;
            _pressedButton = -1;
            SetToolTip(null);
            Invalidate();
        }

        private void OnBtnFeedClick()
        {
            var controller = BrainController.Instance;
            if (controller != null)
            {
                controller.Feed("hay");
            }
            else if (_petForm != null)
            {
                _petForm.PlayAnimationByName("eat");
            }

            Invalidate();
        }

        private void OnBtnPetClick()
        {
            var controller = BrainController.Instance;
            if (controller != null)
            {
                controller.PetPig();
            }
            else if (InteractionManager.Instance != null)
            {
                InteractionManager.Instance.TriggerPetting();
            }
            else if (_petForm != null)
            {
                _petForm.PlayAnimationByName("purr_pet");
            }

            Invalidate();
        }

        private void OnBtnCallClick()
        {
            var controller = BrainController.Instance;
            if (controller != null)
            {
                controller.CallPet();
            }
            else if (InteractionManager.Instance != null)
            {
                InteractionManager.Instance.CallPet();
            }

            Invalidate();
        }

        private void OnBtnDomekClick()
        {
            HomeWindow.ShowHome();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            _updateTimer?.Stop();
            _updateTimer?.Dispose();
            _toolTip?.Dispose();
            base.OnFormClosing(e);
        }
    }

    /// <summary>Alias dla kompatybilności wstecznej.</summary>
    public static class FormStatusBubble { }
}

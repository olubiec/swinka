using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;
using Cuy.Core.Time;

namespace Cuy.Core.AI
{
    /// <summary>
    /// Mózg świnki (Utility AI): podejmuje decyzje o wyborze kolejnej czynności,
    /// zarządza czasem trwania, cooldownami, limitami dziennymi i budżetem czasu.
    /// Zgodny z .NET Standard 2.0 (brak zależności od WinForms/Win32).
    /// </summary>
    public sealed class Brain
    {
        private readonly ActionsConfiguration _config;
        private readonly Pet _pet;
        private readonly Random _random;

        private readonly Dictionary<string, double> _cooldownsUntilSec = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, int> _dailyCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, double> _groupAccumulatedSeconds = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, int> _rareBehaviorCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        private int _currentDay = -1;
        private double _totalSimulatedSeconds;
        private ActionDecision _currentAction;
        private TimeSpan _remainingDuration;
        private bool _isInterrupted;
        private string _interruptedReason;
        private string _lastActionId;
        private int _consecutiveCount;

        // Wewnętrzne wartości rezerwowe, gdy Brain używany jest bez obiektu Pet (np. w izolowanych testach jednostkowych)
        private readonly Needs _fallbackNeeds = new Needs();
        private LifeStage _fallbackStage = LifeStage.Adult;

        public Brain(ActionsConfiguration config, Pet pet = null, Random random = null)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));
            _pet = pet;
            _random = random ?? new Random();

            // Inicjalizacja liczników grup budżetu
            if (_config.DailyBudget != null && _config.DailyBudget.TargetPercentages != null)
            {
                foreach (var k in _config.DailyBudget.TargetPercentages.Keys)
                {
                    _groupAccumulatedSeconds[k] = 0.0;
                }
            }

            // Inicjalizacja liczników rzadkich zachowań
            if (_config.DailyBudget != null && _config.DailyBudget.RareBehaviorsPerDay != null)
            {
                foreach (var k in _config.DailyBudget.RareBehaviorsPerDay.Keys)
                {
                    _rareBehaviorCounts[k] = 0;
                }
            }
        }

        // ---- Właściwości stanu -----------------------------------------------

        public ActionsConfiguration Config => _config;
        public Pet Pet => _pet;
        public ActionDecision CurrentAction => _currentAction;
        public TimeSpan RemainingDuration => _remainingDuration;
        public bool IsInterrupted => _isInterrupted;
        public string InterruptedReason => _interruptedReason;
        public string LastActionId => _lastActionId;
        public int ConsecutiveCount => _consecutiveCount;
        public double TotalSimulatedSeconds => _totalSimulatedSeconds;

        /// <summary>Zapas siana w paśniku (0-100). Domyślnie 100.</summary>
        public double HayInRack { get; set; } = 100.0;

        /// <summary>Temperatura otoczenia w °C (null = brak wpływu temperatury).</summary>
        public double? TemperatureC { get; set; }

        /// <summary>Czy świnka ma towarzysza (odblokowuje zachowania społeczne).</summary>
        public bool HasCompanion { get; set; }

        /// <summary>Czy użytkownik jest bezczynny (np. brak ruchu myszą/klawiaturą przez >= 10 minut).</summary>
        public bool IsUserIdle { get; set; }

        /// <summary>Czas bezczynności użytkownika (np. z Win32 GetLastInputInfo).</summary>
        public TimeSpan UserIdleDuration { get; set; }

        public Needs CurrentNeeds => _pet != null ? _pet.Needs : _fallbackNeeds;
        public LifeStage CurrentStage => _pet != null ? _pet.Stage : _fallbackStage;

        public void SetFallbackStage(LifeStage stage)
        {
            _fallbackStage = stage;
        }

        // ---- Wczytywanie konfiguracji ----------------------------------------

        public static Brain Load(string jsonContent, Pet pet = null, Random random = null)
        {
            if (string.IsNullOrEmpty(jsonContent)) throw new ArgumentNullException(nameof(jsonContent));
            var config = JsonConvert.DeserializeObject<ActionsConfiguration>(jsonContent);
            return new Brain(config, pet, random);
        }

        public static Brain Load(Stream stream, Pet pet = null, Random random = null)
        {
            if (stream == null) throw new ArgumentNullException(nameof(stream));
            using (var reader = new StreamReader(stream))
            {
                string json = reader.ReadToEnd();
                return Load(json, pet, random);
            }
        }

        public static Brain LoadFromFile(string filePath, Pet pet = null, Random random = null)
        {
            if (!File.Exists(filePath)) throw new FileNotFoundException("Nie znaleziono pliku konfiguracji actions.json", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json, pet, random);
        }

        /// <summary>
        /// Wczytuje domyślny plik actions.json (z katalogu projektu lub z wbudowanego zasobu assembly).
        /// </summary>
        public static Brain CreateDefault(Pet pet = null, Random random = null)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory ?? Directory.GetCurrentDirectory();
            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "assets", "data", "actions.json"),
                Path.Combine(baseDir, "actions.json"),
                Path.Combine(baseDir, "..", "assets", "data", "actions.json"),
                Path.Combine(baseDir, "..", "..", "assets", "data", "actions.json"),
                Path.Combine(baseDir, "..", "..", "..", "assets", "data", "actions.json"),
                Path.Combine(baseDir, "..", "..", "..", "..", "assets", "data", "actions.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "data", "actions.json"),
                Path.Combine(baseDir, "swinka", "dane", "actions.json"),
                Path.Combine(baseDir, "..", "swinka", "dane", "actions.json"),
                Path.Combine(baseDir, "..", "..", "swinka", "dane", "actions.json")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    string fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return LoadFromFile(fullPath, pet, random);
                    }
                }
                catch { }
            }

            // Fallback: zasób wbudowany w DLL
            var asm = typeof(Brain).GetTypeInfo().Assembly;
            foreach (var resName in asm.GetManifestResourceNames())
            {
                if (resName.EndsWith("actions.json", StringComparison.OrdinalIgnoreCase))
                {
                    using (var stream = asm.GetManifestResourceStream(resName))
                    {
                        if (stream != null) return Load(stream, pet, random);
                    }
                }
            }

            throw new InvalidOperationException("Nie udało się odnaleźć pliku actions.json w filesystemie ani w zasobach biblioteki.");
        }

        // ---- Wybór czynności (Utility AI) ------------------------------------

        /// <summary>
        /// Wybiera najbardziej opłacalną czynność na podstawie wzoru utility AI:
        /// zysk = suma((1 - potrzeba/100)^2 * efekt) * losowo(0.8, 1.2) + waga_bazowa,
        /// z uwzględnieniem cooldownów, limitów dziennych, pór dnia i budżetu dnia.
        /// </summary>
        public ActionDecision DecideNextAction()
        {
            int day = CurrentDay;
            if (day != _currentDay)
            {
                _currentDay = day;
                _dailyCounts.Clear();
            }

            int hour = CurrentHour;
            double totalTimeSoFar = Math.Max(1.0, GetTotalTimeAcrossGroups());

            ActionDefinition bestAction = null;
            double bestScore = double.NegativeInfinity;

            foreach (var action in _config.Actions)
            {
                if (!IsActionAvailable(action, day))
                    continue;

                double score = CalculateScore(action, hour, totalTimeSoFar);
                if (score > bestScore)
                {
                    bestScore = score;
                    bestAction = action;
                }
            }

            // Bezpieczny fallback – jeśli żadna czynność nie przeszła warunków, wybieramy odpoczynek (idle)
            if (bestAction == null)
            {
                bestAction = _config.Actions.Find(a => a.Id == "rest" || a.Id == "odpoczynek") ?? (_config.Actions.Count > 0 ? _config.Actions[0] : null);
                bestScore = 0.5;
            }

            // Rejestracja powtórzeń z rzędu
            if (bestAction.Id == _lastActionId)
            {
                _consecutiveCount++;
            }
            else
            {
                _lastActionId = bestAction.Id;
                _consecutiveCount = 1;
            }

            // Rejestracja licznika dziennego
            int currentCount;
            _dailyCounts.TryGetValue(bestAction.Id, out currentCount);
            _dailyCounts[bestAction.Id] = currentCount + 1;

            // Wylosowanie czasu trwania z zakresu czas_s
            double durSec = SampleRange(bestAction.MinDurationSeconds, bestAction.MaxDurationSeconds);
            TimeSpan duration = TimeSpan.FromSeconds(durSec);

            // Cooldown
            if (bestAction.CooldownSeconds.HasValue && bestAction.CooldownSeconds.Value > 0)
            {
                _cooldownsUntilSec[bestAction.Id] = _totalSimulatedSeconds + bestAction.CooldownSeconds.Value;
            }

            // Dystans ruchu dla spaceru / czynności ruchowych
            int moveDist = 0;
            if (bestAction.IsMovement)
            {
                moveDist = (int)Math.Round(SampleRange(bestAction.MinDistancePx, bestAction.MaxDistancePx));
            }

            // Zużycie zasobów (np. siano w paśniku)
            if (bestAction.Consumes != null)
            {
                double hayCost;
                if (bestAction.Consumes.TryGetValue("siano_w_pasniku", out hayCost))
                {
                    HayInRack = Math.Max(0.0, HayInRack - hayCost);
                }
            }

            // Rzadkie zachowania
            if (_rareBehaviorCounts.ContainsKey(bestAction.Id))
            {
                _rareBehaviorCounts[bestAction.Id]++;
            }

            string group = ActionDefinition.GetBudgetGroup(bestAction.Id, _config?.DailyBudget);
            var decision = new ActionDecision(
                bestAction.Id,
                bestAction.Animation,
                duration,
                moveDist,
                group,
                bestAction.Effects,
                bestScore,
                bestAction);

            _currentAction = decision;
            _remainingDuration = duration;
            _isInterrupted = false;
            _interruptedReason = null;

            // Aplikacja efektów na potrzeby
            ApplyEffects(bestAction.Effects);

            return decision;
        }

        public int CurrentHour
        {
            get
            {
                if (_pet != null && _pet.Clock != null)
                {
                    return _pet.Clock.LocalNow().Hour;
                }
                return (int)Math.Floor((_totalSimulatedSeconds / 3600.0) % 24.0);
            }
        }

        public int CurrentDay
        {
            get
            {
                if (_pet != null && _pet.Clock != null)
                {
                    return (int)Math.Floor((_pet.Clock.UtcNow - _pet.State.BirthDateUtc).TotalDays);
                }
                return (int)Math.Floor(_totalSimulatedSeconds / 86400.0);
            }
        }

        /// <summary>
        /// Zwraca listę wszystkich czynności z obliczonymi wynikami utility oraz stanem dostępności
        /// (wykorzystywane m.in. przez nakładkę telemetryczną F9).
        /// </summary>
        public IReadOnlyList<ActionScoreInfo> EvaluateAllActionScores()
        {
            var list = new List<ActionScoreInfo>();
            int day = CurrentDay;
            int hour = CurrentHour;
            double totalTimeSoFar = Math.Max(1.0, GetTotalTimeAcrossGroups());

            foreach (var action in _config.Actions)
            {
                string reason;
                bool available = CheckActionAvailability(action, day, out reason);
                double score = CalculateScore(action, hour, totalTimeSoFar);
                bool isCurrent = _currentAction != null && _currentAction.ActionId == action.Id;

                list.Add(new ActionScoreInfo
                {
                    ActionId = action.Id,
                    AnimationName = action.Animation,
                    Group = ActionDefinition.GetBudgetGroup(action.Id, _config?.DailyBudget),
                    Score = score,
                    IsAvailable = available,
                    UnavailableReason = reason,
                    IsCurrent = isCurrent
                });
            }

            return list;
        }

        private bool IsActionAvailable(ActionDefinition action, int day)
        {
            string reason;
            return CheckActionAvailability(action, day, out reason);
        }

        private bool CheckActionAvailability(ActionDefinition action, int day, out string unavailableReason)
        {
            unavailableReason = null;

            // 1. Cooldown
            double cdUntil;
            if (_cooldownsUntilSec.TryGetValue(action.Id, out cdUntil) && _totalSimulatedSeconds < cdUntil)
            {
                unavailableReason = string.Format("Cooldown ({0:0}s)", Math.Ceiling(cdUntil - _totalSimulatedSeconds));
                return false;
            }

            // 2. Limit dzienny
            int? limit = action.GetDailyLimit(CurrentStage);
            if (limit.HasValue)
            {
                int count;
                _dailyCounts.TryGetValue(action.Id, out count);
                if (count >= limit.Value)
                {
                    unavailableReason = string.Format("Limit dzienny ({0}/{1})", count, limit.Value);
                    return false;
                }
            }

            // 3. Maksymalnie 2 razy z rzędu ta sama czynność
            if (_consecutiveCount >= 2 && action.Id == _lastActionId)
            {
                unavailableReason = "Maks. 2x z rzędu";
                return false;
            }

            // 4. Warunki środowiskowe i potrzeby
            if (action.Conditions != null && action.Conditions.Count > 0)
            {
                var needs = CurrentNeeds;
                foreach (var kv in action.Conditions)
                {
                    string key = kv.Key;
                    switch (key.ToLowerInvariant())
                    {
                        case "mood_min":
                        case "humor_min":
                            if (needs.Mood < (double)kv.Value) { unavailableReason = string.Format("Humor < {0:0}", kv.Value); return false; }
                            break;
                        case "mood_max":
                        case "humor_max":
                            if (needs.Mood > (double)kv.Value) { unavailableReason = string.Format("Humor > {0:0}", kv.Value); return false; }
                            break;
                        case "energy_min":
                        case "energia_min":
                            if (needs.Energy < (double)kv.Value) { unavailableReason = string.Format("Energia < {0:0}", kv.Value); return false; }
                            break;
                        case "energy_max":
                        case "energia_max":
                            double maxEnergy = (double)kv.Value;
                            // Przy bezczynności użytkownika świnka kładzie się spać, chyba że energia jest już pełna
                            if (IsUserIdle && (action.Id == "sleep" || action.Id == "sleep_house" || action.Id == "doze"))
                            {
                                maxEnergy = 95.0;
                            }
                            if (needs.Energy > maxEnergy) { unavailableReason = string.Format("Energia > {0:0}", maxEnergy); return false; }
                            break;
                        case "idle":
                        case "bezczynnosc":
                            if ((bool)kv.Value && !IsUserIdle) { unavailableReason = "Wymaga bezczynności"; return false; }
                            if (!(bool)kv.Value && IsUserIdle) { unavailableReason = "Niedostępne przy bezczynności"; return false; }
                            break;
                        case "idle_min_s":
                        case "bezczynnosc_min_s":
                            if (UserIdleDuration.TotalSeconds < (double)kv.Value) { unavailableReason = string.Format("Bezczynność < {0:0}s", kv.Value); return false; }
                            break;
                        case "satiety_min":
                        case "fullness_min":
                        case "najedzenie_min":
                            if (needs.Satiety < (double)kv.Value) { unavailableReason = string.Format("Najedzenie < {0:0}", kv.Value); return false; }
                            break;
                        case "satiety_max":
                        case "fullness_max":
                        case "najedzenie_max":
                            if (needs.Satiety > (double)kv.Value) { unavailableReason = string.Format("Najedzenie > {0:0}", kv.Value); return false; }
                            break;
                        case "vitamin_c_min":
                        case "witamina_c_min":
                            if (needs.VitaminC < (double)kv.Value) { unavailableReason = string.Format("Wit. C < {0:0}", kv.Value); return false; }
                            break;
                        case "vitamin_c_max":
                        case "witamina_c_max":
                            if (needs.VitaminC > (double)kv.Value) { unavailableReason = string.Format("Wit. C > {0:0}", kv.Value); return false; }
                            break;
                        case "health_min":
                        case "zdrowie_min":
                            if (needs.Health < (double)kv.Value) { unavailableReason = string.Format("Zdrowie < {0:0}", kv.Value); return false; }
                            break;
                        case "health_max":
                        case "zdrowie_max":
                            if (needs.Health > (double)kv.Value) { unavailableReason = string.Format("Zdrowie > {0:0}", kv.Value); return false; }
                            break;
                        case "hay_in_rack_min":
                        case "siano_w_pasniku_min":
                            if (HayInRack < (double)kv.Value) { unavailableReason = string.Format("Brak siana ({0:0} < {1:0})", HayInRack, kv.Value); return false; }
                            break;
                        case "item":
                        case "przedmiot":
                            string item = (string)kv.Value;
                            if (_pet == null || (_pet.GetItemCount(item) <= 0)) { unavailableReason = string.Format("Brak: {0}", item); return false; }
                            break;
                        case "companion":
                        case "towarzysz":
                            if (!HasCompanion) { unavailableReason = "Wymaga towarzysza"; return false; }
                            break;
                        case "temperature_min":
                        case "temperatura_min":
                            if (!TemperatureC.HasValue || TemperatureC.Value < (double)kv.Value) { unavailableReason = string.Format("Temp. < {0:0}°C", kv.Value); return false; }
                            break;
                        case "temperature_max":
                        case "temperatura_max":
                            if (!TemperatureC.HasValue || TemperatureC.Value > (double)kv.Value) { unavailableReason = string.Format("Temp. > {0:0}°C", kv.Value); return false; }
                            break;
                    }
                }
            }

            return true;
        }

        private double CalculateScore(ActionDefinition action, int hour, double totalTimeSoFar)
        {
            var needs = CurrentNeeds;

            // Wzór podstawowy: suma((1 - potrzeba/100)^2 * efekt)
            double satisfactionSum = 0.0;
            if (action.Effects != null)
            {
                foreach (var kv in action.Effects)
                {
                    double needVal;
                    if (TryGetNeedValue(kv.Key, out needVal))
                    {
                        double urgency = Math.Pow(1.0 - (needVal / 100.0), 2.0);
                        satisfactionSum += urgency * kv.Value;
                    }
                }
            }

            // Losowy mnożnik 0.8 - 1.2
            double randMult = 0.8 + (_random.NextDouble() * 0.4);
            double baseZysk = (satisfactionSum * randMult) + (action.BaseWeight ?? 0.0);

            // Mnożnik etapu życia
            baseZysk *= action.GetStageMultiplier(CurrentStage);

            // Mnożnik pory dnia
            string group = ActionDefinition.GetBudgetGroup(action.Id, _config?.DailyBudget);
            bool isNight = (hour >= 23 || hour < 7);
            bool isSleepOrDoze = (action.Id == "sleep" || action.Id == "sleep_house" || action.Id == "doze");

            if (isNight)
            {
                // Noc 23:00 - 7:00: czynności snu i drzemki mają wagę x2.0, aktywność x0.5
                if (isSleepOrDoze || group == "rest_and_naps" || group == "odpoczynek_i_drzemki")
                {
                    baseZysk *= 2.0;
                }
                else if (group == "walking" || group == "chodzenie" || group == "sniffing_looking" || group == "weszenie_rozgladanie" || group == "play_and_rare" || group == "zabawa_i_rzadkie")
                {
                    baseZysk *= 0.5;
                }
            }
            else if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 21))
            {
                // Aktywność x1.5 o świcie i zmierzchu
                if (group == "walking" || group == "chodzenie" || group == "sniffing_looking" || group == "weszenie_rozgladanie" || group == "play_and_rare" || group == "zabawa_i_rzadkie")
                {
                    baseZysk *= 1.5;
                }
            }
            else if (hour >= 11 && hour < 15)
            {
                // Drzemki x1.6 w południe
                if (group == "rest_and_naps" || group == "odpoczynek_i_drzemki")
                {
                    baseZysk *= 1.6;
                }
            }

            // Mnożnik pory zdefiniowany bezpośrednio w czynności (jeśli nie został jeszcze zaaplikowany przez isNight)
            if (action.PeriodMultipliers != null && action.PeriodMultipliers.Count > 0)
            {
                foreach (var pm in action.PeriodMultipliers)
                {
                    if (pm.Key == "23-7")
                    {
                        if (!isNight && (hour >= 23 || hour < 7))
                        {
                            baseZysk *= pm.Value;
                        }
                    }
                    else if (pm.Key == "11-15" && (hour >= 11 && hour < 15) && group != "rest_and_naps" && group != "odpoczynek_i_drzemki")
                    {
                        baseZysk *= pm.Value;
                    }
                }
            }

            // Wpływ bezczynności użytkownika na wybór czynności (warunek/preferencja Utility AI, nie twarde wymuszenie)
            if (IsUserIdle)
            {
                // Świnka nie kładzie się spać z nudów, gdy jest skrajnie głodna (Satiety < 15)
                double idleSleepBonus = (needs.Satiety < 15.0) ? 0.0 : 3.5;
                double idleDozeBonus = (needs.Satiety < 15.0) ? 0.0 : 2.0;

                if (action.Id == "sleep" || action.Id == "sleep_house" || action.Id == "sleep_in_house")
                {
                    baseZysk += idleSleepBonus;
                }
                else if (action.Id == "doze" || action.Id == "nap")
                {
                    baseZysk += idleDozeBonus;
                }
                else if (group == "walking" || group == "chodzenie" || action.Id == "zoomies" || action.Id == "popcorn")
                {
                    baseZysk *= 0.5;
                }
            }

            // Sprzężenie zwrotne budżetu dnia:
            // Utrzymuje odchylenie od budzet_dnia poniżej 5 punktów procentowych.
            if (_config.DailyBudget != null && _config.DailyBudget.TargetPercentages != null)
            {
                double targetPct;
                if (_config.DailyBudget.TargetPercentages.TryGetValue(group, out targetPct))
                {
                    double accSec;
                    _groupAccumulatedSeconds.TryGetValue(group, out accSec);
                    double actualPct = (accSec / totalTimeSoFar) * 100.0;
                    double deficit = targetPct - actualPct;

                    // Specjalny impuls dla rzadkich czynności, aby wykonały się zgodnie z limitem dziennym
                    if (action.Id == "scratch" || action.Id == "scratching" || action.Id == "drapanie" || action.Id == "chin_rub" || action.Id == "chin_marking" || action.Id == "znaczenie_broda" || action.Id == "popcorn" || action.Id == "zoomies")
                    {
                        baseZysk += 2.0;
                    }
                    else
                    {
                        // Sprzężenie zwrotne budżetu łagodnie narasta wraz z upływem czasu (warmup)
                        double warmup = Math.Min(1.0, totalTimeSoFar / 1800.0);
                        double needMul = ((action.Id == "eat_hay" || action.Id == "jedzenie_siana") && deficit > 0)
                            ? Math.Max(0.0, 1.0 - (needs.Satiety / 100.0))
                            : 1.0;
                        baseZysk += deficit * 0.8 * warmup * needMul;
                    }
                }
            }

            return baseZysk;
        }

        private bool TryGetNeedValue(string needName, out double val)
        {
            var n = CurrentNeeds;
            switch (needName.ToLowerInvariant())
            {
                case "fullness": val = n.Satiety; return true;
                case "vitamin_c": val = n.VitaminC; return true;
                case "energy": val = n.Energy; return true;
                case "mood": val = n.Mood; return true;
                case "cleanliness": val = n.Cleanliness; return true;
                case "teeth": val = n.Teeth; return true;
                case "health": val = n.Health; return true;
                default: val = 0.0; return false;
            }
        }

        private void ApplyEffects(IReadOnlyDictionary<string, double> effects)
        {
            if (effects == null || effects.Count == 0) return;
            var n = CurrentNeeds;
            foreach (var kv in effects)
            {
                switch (kv.Key.ToLowerInvariant())
                {
                    case "fullness": n.Satiety = ClampNeed(n.Satiety + kv.Value); break;
                    case "vitamin_c": n.VitaminC = ClampNeed(n.VitaminC + kv.Value); break;
                    case "energy": n.Energy = ClampNeed(n.Energy + kv.Value); break;
                    case "mood": n.Mood = ClampNeed(n.Mood + kv.Value); break;
                    case "cleanliness": n.Cleanliness = ClampNeed(n.Cleanliness + kv.Value); break;
                    case "teeth": n.Teeth = ClampNeed(n.Teeth + kv.Value); break;
                }
            }
        }

        private static double ClampNeed(double val)
        {
            return Math.Max(0.0, Math.Min(100.0, val));
        }

        private double SampleRange(double min, double max)
        {
            if (max <= min) return min;
            return min + (_random.NextDouble() * (max - min));
        }

        private double GetTotalTimeAcrossGroups()
        {
            double sum = 0.0;
            foreach (var v in _groupAccumulatedSeconds.Values) sum += v;
            return sum;
        }

        // ---- Fizyka pulpitu: przerwanie i wznowienie --------------------------

        /// <summary>
        /// Przerywa bieżącą czynność świnki z powodu zdarzenia fizyki (np. podniesienie, spadanie, rzut).
        /// Zapamiętuje pozostały czas trwania akcji.
        /// </summary>
        public void Interrupt(string reason = null)
        {
            _isInterrupted = true;
            _interruptedReason = reason ?? "physics";
        }

        /// <summary>
        /// Wznawia działanie mózgu po zakończeniu interakcji fizyki.
        /// Jeśli przerwana czynność miała jeszcze czas trwania, kontynuuje ją; w przeciwnym razie wybiera nową.
        /// </summary>
        public ActionDecision Resume()
        {
            _isInterrupted = false;
            _interruptedReason = null;

            if (_currentAction != null && _remainingDuration > TimeSpan.FromSeconds(0.5))
            {
                return _currentAction;
            }

            return DecideNextAction();
        }

        // ---- Aktualizacja czasu (symulacja / pętla gry) -----------------------

        /// <summary>
        /// Aktualizuje upływ czasu w mózgu świnki.
        /// Odlicza czas trwania czynności, zlicza statystyki budżetu i wybiera kolejną czynność po zakończeniu poprzedniej.
        /// </summary>
        public void Update(TimeSpan elapsed)
        {
            if (elapsed <= TimeSpan.Zero) return;
            double sec = elapsed.TotalSeconds;
            _totalSimulatedSeconds += sec;

            if (_isInterrupted)
            {
                // Świnka jest pod wpływem fizyki (np. w powietrzu lub przeciągana) – czas czynności nie płynie
                return;
            }

            // Naturalny spadek potrzeb w trybie autonomicznym Brain (bez zewnętrznego obiektu Pet)
            if (_pet == null && _config.DecayPerHour != null)
            {
                double hours = sec / 3600.0;
                var n = _fallbackNeeds;
                double decay;
                if (_config.DecayPerHour.TryGetValue("fullness", out decay)) n.Satiety = Math.Max(0.0, n.Satiety - (decay * hours));
                if (_config.DecayPerHour.TryGetValue("vitamin_c", out decay)) n.VitaminC = Math.Max(0.0, n.VitaminC - (decay * hours));
                bool isAutoSleeping = (_currentAction != null && (_currentAction.ActionId == "sleep" || _currentAction.ActionId == "sleep_house" || _currentAction.ActionId == "sleep_in_house" || _currentAction.ActionId == "doze" || _currentAction.ActionId == "nap"));
                if (isAutoSleeping)
                {
                    // Sen podnosi energię
                    n.Energy = Math.Min(100.0, n.Energy + (15.0 * hours));
                }
                else if (_config.DecayPerHour.TryGetValue("energy", out decay))
                {
                    n.Energy = Math.Max(0.0, n.Energy - (decay * hours));
                }
                if (_config.DecayPerHour.TryGetValue("mood", out decay)) n.Mood = Math.Max(0.0, n.Mood - (decay * hours));
                if (_config.DecayPerHour.TryGetValue("cleanliness", out decay)) n.Cleanliness = Math.Max(0.0, n.Cleanliness - (decay * hours));
                if (_config.DecayPerHour.TryGetValue("teeth", out decay)) n.Teeth = Math.Max(0.0, n.Teeth - (decay * hours));
            }

            if (_currentAction == null)
            {
                DecideNextAction();
                return;
            }

            // Zliczamy czas do odpowiedniej grupy budżetu
            string group = _currentAction.Group;
            double currentAcc;
            _groupAccumulatedSeconds.TryGetValue(group, out currentAcc);
            _groupAccumulatedSeconds[group] = currentAcc + sec;

            _remainingDuration -= elapsed;
            if (_remainingDuration <= TimeSpan.Zero)
            {
                // Bieżąca czynność dobiegła końca – wybieramy kolejną
                DecideNextAction();
            }
        }

        // ---- Raport budżetu dnia ---------------------------------------------

        /// <summary>
        /// Generuje raport budżetu czasu: udział procentowy każdej grupy,
        /// odchylenie od założeń budzet_dnia oraz zliczenia rzadkich zachowań na dobę.
        /// </summary>
        public BudgetReport GetBudgetReport(double? daysCount = null)
        {
            double totalSec = GetTotalTimeAcrossGroups();
            if (totalSec <= 0) totalSec = Math.Max(1.0, _totalSimulatedSeconds);

            double days = daysCount.HasValue && daysCount.Value > 0
                ? daysCount.Value
                : Math.Max(1.0 / 24.0, totalSec / 86400.0);

            var report = new BudgetReport
            {
                TotalTime = TimeSpan.FromSeconds(totalSec),
                DaysCount = days,
                IsAllWithinTolerance = true
            };

            if (_config.DailyBudget != null && _config.DailyBudget.TargetPercentages != null)
            {
                foreach (var kv in _config.DailyBudget.TargetPercentages)
                {
                    string grp = kv.Key;
                    double target = kv.Value;

                    double actualSec;
                    if (!_groupAccumulatedSeconds.TryGetValue(grp, out actualSec))
                    {
                        string plGrp = ActionDefinition.ToPolishBudgetGroup(grp);
                        if (!_groupAccumulatedSeconds.TryGetValue(plGrp, out actualSec))
                        {
                            string enGrp = ActionDefinition.GetBudgetGroupEnglish(grp);
                            _groupAccumulatedSeconds.TryGetValue(enGrp, out actualSec);
                        }
                    }
                    double actualPct = (actualSec / totalSec) * 100.0;
                    double diff = actualPct - target;
                    bool withinTol = Math.Abs(diff) <= 5.0;

                    if (!withinTol) report.IsAllWithinTolerance = false;

                    report.Groups.Add(new GroupBudgetStats
                    {
                        GroupName = grp,
                        TotalSeconds = actualSec,
                        ActualPercentage = actualPct,
                        TargetPercentage = target,
                        DeviationPercentagePoints = diff,
                        IsWithinTolerance = withinTol
                    });
                }
            }

            // Rzadkie zachowania na dobę
            if (_config.DailyBudget != null && _config.DailyBudget.RareBehaviorsPerDay != null)
            {
                foreach (var kv in _config.DailyBudget.RareBehaviorsPerDay)
                {
                    string name = kv.Key;
                    int count;
                    _rareBehaviorCounts.TryGetValue(name, out count);
                    double perDay = count / days;
                    report.RareBehaviorsPerDay[name] = perDay;
                    report.RareBehaviorTargets[name] = kv.Value;
                }
            }

            return report;
        }
    }

    /// <summary>
    /// Informacje o ocenie danej czynności przez Utility AI (dla nakładki F9).
    /// </summary>
    public sealed class ActionScoreInfo
    {
        public string ActionId { get; set; }
        public string AnimationName { get; set; }
        public string Group { get; set; }
        public double Score { get; set; }
        public bool IsAvailable { get; set; }
        public string UnavailableReason { get; set; }
        public bool IsCurrent { get; set; }
    }
}

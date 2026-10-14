using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;
using Cuy.Core.Time;

namespace Cuy.Core.AI
{
    /// <summary>
    /// The pig's brain (Utility AI): picks the next action,
    /// manages durations, cooldowns, daily limits and the time budget.
    /// .NET Standard 2.0 compatible (no WinForms/Win32 dependencies).
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

        // Internal fallback values when Brain runs without a Pet object (e.g. isolated unit tests)
        private readonly Needs _fallbackNeeds = new Needs();
        private LifeStage _fallbackStage = LifeStage.Adult;

        public Brain(ActionsConfiguration config, Pet pet = null, Random random = null)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));
            _pet = pet;
            _random = random ?? new Random();

            // Initialise the budget group counters
            if (_config.DailyBudget != null && _config.DailyBudget.TargetPercentages != null)
            {
                foreach (var k in _config.DailyBudget.TargetPercentages.Keys)
                {
                    _groupAccumulatedSeconds[k] = 0.0;
                }
            }

            // Initialise the rare behaviour counters
            if (_config.DailyBudget != null && _config.DailyBudget.RareBehaviorsPerDay != null)
            {
                foreach (var k in _config.DailyBudget.RareBehaviorsPerDay.Keys)
                {
                    _rareBehaviorCounts[k] = 0;
                }
            }
        }

        // ---- State properties ------------------------------------------------

        public ActionsConfiguration Config => _config;
        public Pet Pet => _pet;
        public ActionDecision CurrentAction => _currentAction;
        public TimeSpan RemainingDuration => _remainingDuration;
        public bool IsInterrupted => _isInterrupted;
        public string InterruptedReason => _interruptedReason;
        public string LastActionId => _lastActionId;
        public int ConsecutiveCount => _consecutiveCount;
        public double TotalSimulatedSeconds => _totalSimulatedSeconds;

        /// <summary>Hay in the rack (0-100). Default 100.</summary>
        public double HayInRack { get; set; } = 100.0;

        /// <summary>Ambient temperature in °C (null = no temperature effect).</summary>
        public double? TemperatureC { get; set; }

        /// <summary>Whether the pig has a companion (unlocks social behaviours).</summary>
        public bool HasCompanion { get; set; }

        /// <summary>Whether the user is idle (e.g. no mouse/keyboard input for >= 10 minutes).</summary>
        public bool IsUserIdle { get; set; }

        /// <summary>How long the user has been idle (e.g. from Win32 GetLastInputInfo).</summary>
        public TimeSpan UserIdleDuration { get; set; }

        public Needs CurrentNeeds => _pet != null ? _pet.Needs : _fallbackNeeds;
        public LifeStage CurrentStage => _pet != null ? _pet.Stage : _fallbackStage;

        public void SetFallbackStage(LifeStage stage)
        {
            _fallbackStage = stage;
        }

        // ---- Loading the configuration ---------------------------------------

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
            if (!File.Exists(filePath)) throw new FileNotFoundException("actions.json configuration file not found", filePath);
            string json = File.ReadAllText(filePath);
            return Load(json, pet, random);
        }

        /// <summary>
        /// Loads the default actions.json (from the project folder or the embedded assembly resource).
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

            // Fallback: resource embedded in the DLL
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

            throw new InvalidOperationException("actions.json was not found on disk or in the library resources.");
        }

        // ---- Action selection (Utility AI) -----------------------------------

        /// <summary>
        /// Picks the most worthwhile action using the utility AI formula:
        /// score = sum((1 - need/100)^2 * effect) * random(0.8, 1.2) + base_weight,
        /// taking cooldowns, daily limits, times of day and the day budget into account.
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

            // Safe fallback: if no action passed its conditions, pick rest (idle)
            if (bestAction == null)
            {
                bestAction = _config.Actions.Find(a => a.Id == "rest") ?? (_config.Actions.Count > 0 ? _config.Actions[0] : null);
                bestScore = 0.5;
            }

            // Track repeats in a row
            if (bestAction.Id == _lastActionId)
            {
                _consecutiveCount++;
            }
            else
            {
                _lastActionId = bestAction.Id;
                _consecutiveCount = 1;
            }

            // Track the daily count
            int currentCount;
            _dailyCounts.TryGetValue(bestAction.Id, out currentCount);
            _dailyCounts[bestAction.Id] = currentCount + 1;

            // Pick a duration from the duration_s range
            double durSec = SampleRange(bestAction.MinDurationSeconds, bestAction.MaxDurationSeconds);
            TimeSpan duration = TimeSpan.FromSeconds(durSec);

            // Cooldown
            if (bestAction.CooldownSeconds.HasValue && bestAction.CooldownSeconds.Value > 0)
            {
                _cooldownsUntilSec[bestAction.Id] = _totalSimulatedSeconds + bestAction.CooldownSeconds.Value;
            }

            // Movement distance for walks and other moving actions
            int moveDist = 0;
            if (bestAction.IsMovement)
            {
                moveDist = (int)Math.Round(SampleRange(bestAction.MinDistancePx, bestAction.MaxDistancePx));
            }

            // Resource use (e.g. hay in the rack)
            if (bestAction.Consumes != null)
            {
                double hayCost;
                if (bestAction.Consumes.TryGetValue("hay_in_rack", out hayCost))
                {
                    HayInRack = Math.Max(0.0, HayInRack - hayCost);
                }
            }

            // Rare behaviours
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

            // Apply effects to the needs
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
        /// Returns all actions with their computed utility scores and availability
        /// (used by the F9 telemetry overlay, among others).
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

            // 2. Daily limit
            int? limit = action.GetDailyLimit(CurrentStage);
            if (limit.HasValue)
            {
                int count;
                _dailyCounts.TryGetValue(action.Id, out count);
                if (count >= limit.Value)
                {
                    unavailableReason = string.Format("Daily limit ({0}/{1})", count, limit.Value);
                    return false;
                }
            }

            // 3. At most 2 times in a row for the same action
            if (_consecutiveCount >= 2 && action.Id == _lastActionId)
            {
                unavailableReason = "Max 2x in a row";
                return false;
            }

            // 4. Environment and need conditions
            if (action.Conditions != null && action.Conditions.Count > 0)
            {
                var needs = CurrentNeeds;
                foreach (var kv in action.Conditions)
                {
                    string key = kv.Key;
                    switch (key.ToLowerInvariant())
                    {
                        case "mood_min":
                            if (needs.Mood < (double)kv.Value) { unavailableReason = string.Format("Mood < {0:0}", kv.Value); return false; }
                            break;
                        case "mood_max":
                            if (needs.Mood > (double)kv.Value) { unavailableReason = string.Format("Mood > {0:0}", kv.Value); return false; }
                            break;
                        case "energy_min":
                            if (needs.Energy < (double)kv.Value) { unavailableReason = string.Format("Energy < {0:0}", kv.Value); return false; }
                            break;
                        case "energy_max":
                            double maxEnergy = (double)kv.Value;
                            // When the user is idle the pig goes to sleep, unless energy is already full
                            if (IsUserIdle && (action.Id == "sleep" || action.Id == "sleep_in_house" || action.Id == "nap"))
                            {
                                maxEnergy = 95.0;
                            }
                            if (needs.Energy > maxEnergy) { unavailableReason = string.Format("Energy > {0:0}", maxEnergy); return false; }
                            break;
                        case "idle":
                            if ((bool)kv.Value && !IsUserIdle) { unavailableReason = "Needs user idle"; return false; }
                            if (!(bool)kv.Value && IsUserIdle) { unavailableReason = "Not while user idle"; return false; }
                            break;
                        case "idle_min_s":
                            if (UserIdleDuration.TotalSeconds < (double)kv.Value) { unavailableReason = string.Format("Idle < {0:0}s", kv.Value); return false; }
                            break;
                        case "satiety_min":
                        case "fullness_min":
                            if (needs.Satiety < (double)kv.Value) { unavailableReason = string.Format("Fullness < {0:0}", kv.Value); return false; }
                            break;
                        case "satiety_max":
                        case "fullness_max":
                            if (needs.Satiety > (double)kv.Value) { unavailableReason = string.Format("Fullness > {0:0}", kv.Value); return false; }
                            break;
                        case "vitamin_c_min":
                            if (needs.VitaminC < (double)kv.Value) { unavailableReason = string.Format("Wit. C < {0:0}", kv.Value); return false; }
                            break;
                        case "vitamin_c_max":
                            if (needs.VitaminC > (double)kv.Value) { unavailableReason = string.Format("Wit. C > {0:0}", kv.Value); return false; }
                            break;
                        case "health_min":
                            if (needs.Health < (double)kv.Value) { unavailableReason = string.Format("Health < {0:0}", kv.Value); return false; }
                            break;
                        case "health_max":
                            if (needs.Health > (double)kv.Value) { unavailableReason = string.Format("Health > {0:0}", kv.Value); return false; }
                            break;
                        case "hay_in_rack_min":
                            if (HayInRack < (double)kv.Value) { unavailableReason = string.Format("No hay ({0:0} < {1:0})", HayInRack, kv.Value); return false; }
                            break;
                        case "item":
                            string item = (string)kv.Value;
                            if (_pet == null || (_pet.GetItemCount(item) <= 0)) { unavailableReason = string.Format("Missing: {0}", item); return false; }
                            break;
                        case "companion":
                            if (!HasCompanion) { unavailableReason = "Needs a companion"; return false; }
                            break;
                        case "temperature_min":
                            if (!TemperatureC.HasValue || TemperatureC.Value < (double)kv.Value) { unavailableReason = string.Format("Temp. < {0:0}°C", kv.Value); return false; }
                            break;
                        case "temperature_max":
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

            // Base formula: sum((1 - need/100)^2 * effect)
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

            // Random multiplier 0.8 - 1.2
            double randMult = 0.8 + (_random.NextDouble() * 0.4);
            double baseZysk = (satisfactionSum * randMult) + (action.BaseWeight ?? 0.0);

            // Life stage multiplier
            baseZysk *= action.GetStageMultiplier(CurrentStage);

            // Time of day multiplier
            string group = ActionDefinition.GetBudgetGroup(action.Id, _config?.DailyBudget);
            bool isNight = (hour >= 23 || hour < 7);
            bool isSleepOrDoze = (action.Id == "sleep" || action.Id == "sleep_in_house" || action.Id == "nap");

            if (isNight)
            {
                // Night 23:00 - 7:00: sleep and nap actions weigh x2.0, activity x0.5
                if (isSleepOrDoze || group == "rest_and_naps")
                {
                    baseZysk *= 2.0;
                }
                else if (group == "walking" || group == "sniffing_and_looking" || group == "play_and_rare")
                {
                    baseZysk *= 0.5;
                }
            }
            else if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 21))
            {
                // Activity x1.5 at dawn and dusk
                if (group == "walking" || group == "sniffing_and_looking" || group == "play_and_rare")
                {
                    baseZysk *= 1.5;
                }
            }
            else if (hour >= 11 && hour < 15)
            {
                // Naps x1.6 at midday
                if (group == "rest_and_naps")
                {
                    baseZysk *= 1.6;
                }
            }

            // Time multiplier defined on the action itself (if not already applied by isNight)
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
                    else if (pm.Key == "11-15" && (hour >= 11 && hour < 15) && group != "rest_and_naps" )
                    {
                        baseZysk *= pm.Value;
                    }
                }
            }

            // User idleness affects the choice (a utility preference, not a hard override)
            if (IsUserIdle)
            {
                // The pig does not fall asleep out of boredom when it is very hungry (Satiety < 15)
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
                else if (group == "walking" || action.Id == "zoomies" || action.Id == "popcorn")
                {
                    baseZysk *= 0.5;
                }
            }

            // Day budget feedback:
            // keeps the deviation from day_budget below 5 percentage points.
            if (_config.DailyBudget != null && _config.DailyBudget.TargetPercentages != null)
            {
                double targetPct;
                if (_config.DailyBudget.TargetPercentages.TryGetValue(group, out targetPct))
                {
                    double accSec;
                    _groupAccumulatedSeconds.TryGetValue(group, out accSec);
                    double actualPct = (accSec / totalTimeSoFar) * 100.0;
                    double deficit = targetPct - actualPct;

                    // Special boost for rare actions so they happen within their daily limit
                    if (action.Id == "scratch" || action.Id == "scratching" || action.Id == "chin_rub" || action.Id == "chin_marking" || action.Id == "popcorn" || action.Id == "zoomies")
                    {
                        baseZysk += 2.0;
                    }
                    else
                    {
                        // Budget feedback ramps up gently over time (warm-up)
                        double warmup = Math.Min(1.0, totalTimeSoFar / 1800.0);
                        double needMul = ((action.Id == "eat_hay") && deficit > 0)
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

        // ---- Desktop physics: interrupt and resume ---------------------------

        /// <summary>
        /// Interrupts the current action because of a physics event (e.g. picked up, falling, thrown).
        /// Remembers the remaining duration of the action.
        /// </summary>
        public void Interrupt(string reason = null)
        {
            _isInterrupted = true;
            _interruptedReason = reason ?? "physics";
        }

        /// <summary>
        /// Resumes the brain after the physics interaction ends.
        /// If the interrupted action still had time left, it continues; otherwise a new one is picked.
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

        // ---- Time update (simulation / game loop) ----------------------------

        /// <summary>
        /// Advances time in the pig's brain.
        /// Counts down the action duration, records budget statistics and picks the next action when one ends.
        /// </summary>
        public void Update(TimeSpan elapsed)
        {
            if (elapsed <= TimeSpan.Zero) return;
            double sec = elapsed.TotalSeconds;
            _totalSimulatedSeconds += sec;

            if (_isInterrupted)
            {
                // The pig is under physics (in the air or being dragged): action time does not pass
                return;
            }

            // Natural need decay in autonomous Brain mode (without an external Pet object)
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
                    // Sleep raises energy
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

            // Add the time to the matching budget group
            string group = _currentAction.Group;
            double currentAcc;
            _groupAccumulatedSeconds.TryGetValue(group, out currentAcc);
            _groupAccumulatedSeconds[group] = currentAcc + sec;

            _remainingDuration -= elapsed;
            if (_remainingDuration <= TimeSpan.Zero)
            {
                // The current action has ended: pick the next one
                DecideNextAction();
            }
        }

        // ---- Day budget report -----------------------------------------------

        /// <summary>
        /// Builds the time budget report: the share of each group,
        /// the deviation from day_budget and rare behaviour counts per day.
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
                        string enGrp = ActionDefinition.GetBudgetGroupEnglish(grp);
                        _groupAccumulatedSeconds.TryGetValue(enGrp, out actualSec);
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

            // Rare behaviours per day
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
    /// Information about how the Utility AI scored an action (for the F9 overlay).
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
